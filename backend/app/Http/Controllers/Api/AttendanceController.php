<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Api\Concerns\AuthorizesSchoolDirecteur;
use App\Http\Controllers\Controller;
use App\Models\Attendance;
use App\Models\ClassStudent;
use App\Models\ClassSubjectTeacher;
use App\Models\ParentStudent;
use App\Models\School;
use App\Models\SchoolUser;
use App\Models\Student;
use App\Notifications\StudentAbsentNotification;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class AttendanceController extends Controller
{
    use AuthorizesSchoolDirecteur;

    private const STAFF_ROLE_SLUGS = ['directeur', 'censeur', 'surveillant', 'secretaire'];

    /**
     * Liste des absences déjà saisies par le professeur pour un cours et
     * une date donnés (vide si la saisie n'a pas encore été faite).
     */
    public function index(Request $request, ClassSubjectTeacher $assignment)
    {
        $this->authorizeAssignment($request, $assignment);

        $validated = $request->validate([
            'date' => ['required', 'date'],
        ]);

        return response()->json(
            $assignment->attendances()
                ->where('date', $validated['date'])
                ->with('student')
                ->get()
        );
    }

    /**
     * Saisie groupée des présences par le professeur pour un cours et une
     * date : {date, records: [{student_id, status}]}.
     */
    public function store(Request $request, ClassSubjectTeacher $assignment)
    {
        $this->authorizeAssignment($request, $assignment);

        $validated = $request->validate([
            'date' => ['required', 'date'],
            'records' => ['required', 'array', 'min:1'],
            'records.*.student_id' => ['required', 'uuid'],
            'records.*.status' => ['required', 'in:'.implode(',', [
                Attendance::STATUS_ABSENT, Attendance::STATUS_PRESENT, Attendance::STATUS_RETARD,
            ])],
        ]);

        $enrolledStudentIds = ClassStudent::query()
            ->where('class_id', $assignment->class_id)
            ->where('season_id', $assignment->season_id)
            ->pluck('student_id')
            ->all();

        foreach ($validated['records'] as $record) {
            if (! in_array($record['student_id'], $enrolledStudentIds, true)) {
                throw ValidationException::withMessages([
                    'records' => ["Un élève sélectionné n'est pas inscrit dans cette classe pour cette saison."],
                ]);
            }
        }

        $attendances = DB::transaction(function () use ($validated, $assignment, $request) {
            $saved = [];

            foreach ($validated['records'] as $record) {
                $saved[] = Attendance::query()->updateOrCreate(
                    [
                        'class_subject_teacher_id' => $assignment->id,
                        'student_id' => $record['student_id'],
                        'date' => $validated['date'],
                    ],
                    [
                        'status' => $record['status'],
                        'recorded_by' => $request->user()->id,
                    ]
                );
            }

            return $saved;
        });

        foreach ($attendances as $attendance) {
            $becameAbsent = $attendance->status === Attendance::STATUS_ABSENT
                && ($attendance->wasRecentlyCreated || $attendance->wasChanged('status'));

            if ($becameAbsent) {
                $this->notifyParentsOfAbsence($attendance);
            }
        }

        return response()->json(
            Attendance::query()
                ->whereIn('id', collect($attendances)->pluck('id'))
                ->with('student')
                ->get()
        );
    }

    /**
     * Alerte les parents (email + notification en app) quand leur enfant
     * est marqué absent.
     */
    private function notifyParentsOfAbsence(Attendance $attendance): void
    {
        $attendance->loadMissing('student.parents');

        foreach ($attendance->student->parents as $parent) {
            $parent->notify(new StudentAbsentNotification($attendance));
        }
    }

    /**
     * Historique des absences d'un élève, accessible au staff concerné ou
     * à son propre parent.
     */
    public function forStudent(Request $request, School $school, Student $student)
    {
        $this->authorizeStaffOrParent($request, $school, $student);

        $attendances = Attendance::query()
            ->where('student_id', $student->id)
            ->whereHas('classSubjectTeacher.schoolClass', fn ($query) => $query->where('school_id', $school->id))
            ->with(['classSubjectTeacher.subject', 'classSubjectTeacher.schoolClass', 'recordedBy', 'justifiedBy'])
            ->latest('date')
            ->get();

        return response()->json($attendances);
    }

    /**
     * Le parent soumet une justification pour une absence/un retard de son
     * enfant.
     */
    public function justify(Request $request, School $school, Attendance $attendance)
    {
        abort_if($attendance->classSubjectTeacher->schoolClass->school_id !== $school->id, 404);

        $isParent = ParentStudent::query()
            ->where('student_id', $attendance->student_id)
            ->where('parent_user_id', $request->user()->id)
            ->exists();

        abort_unless($isParent, 403, "Vous n'êtes pas autorisé à justifier cette absence.");

        abort_if($attendance->status === Attendance::STATUS_PRESENT, 422, "Cette séance ne comporte pas d'absence ou de retard.");

        $validated = $request->validate([
            'justification_reason' => ['required', 'string', 'max:1000'],
        ]);

        $attendance->update([
            'justification_reason' => $validated['justification_reason'],
            'justification_status' => Attendance::JUSTIFICATION_EN_ATTENTE,
        ]);

        return response()->json($attendance->fresh());
    }

    /**
     * File d'attente des justifications à valider par le staff (directeur,
     * censeur, surveillant).
     */
    public function pendingJustifications(Request $request, School $school)
    {
        $this->authorizeAttendanceValidator($request, $school);

        return response()->json(
            Attendance::query()
                ->where('justification_status', Attendance::JUSTIFICATION_EN_ATTENTE)
                ->whereHas('classSubjectTeacher.schoolClass', fn ($query) => $query->where('school_id', $school->id))
                ->with(['student', 'classSubjectTeacher.subject', 'classSubjectTeacher.schoolClass'])
                ->oldest('date')
                ->get()
        );
    }

    public function approveJustification(Request $request, School $school, Attendance $attendance)
    {
        $this->authorizeAttendanceValidator($request, $school);
        abort_if($attendance->classSubjectTeacher->schoolClass->school_id !== $school->id, 404);

        $attendance->update([
            'justification_status' => Attendance::JUSTIFICATION_JUSTIFIEE,
            'justified_by' => $request->user()->id,
            'justified_at' => now(),
        ]);

        return response()->json($attendance->fresh());
    }

    public function rejectJustification(Request $request, School $school, Attendance $attendance)
    {
        $this->authorizeAttendanceValidator($request, $school);
        abort_if($attendance->classSubjectTeacher->schoolClass->school_id !== $school->id, 404);

        $attendance->update([
            'justification_status' => Attendance::JUSTIFICATION_REJETEE,
            'justified_by' => $request->user()->id,
            'justified_at' => now(),
        ]);

        return response()->json($attendance->fresh());
    }

    private function authorizeAssignment(Request $request, ClassSubjectTeacher $assignment): void
    {
        $userId = $request->user()->id;

        if ($assignment->user_id === $userId) {
            return;
        }

        $isDirecteur = SchoolUser::query()
            ->where('school_id', $assignment->schoolClass->school_id)
            ->where('user_id', $userId)
            ->whereHas('role', fn ($query) => $query->where('slug', 'directeur'))
            ->exists();

        abort_unless($isDirecteur, 403, "Vous n'êtes pas autorisé à gérer les absences de cette classe.");
    }

    private function authorizeStaffOrParent(Request $request, School $school, Student $student): void
    {
        $userId = $request->user()->id;

        $isStaff = SchoolUser::query()
            ->where('school_id', $school->id)
            ->where('user_id', $userId)
            ->whereHas('role', fn ($query) => $query->whereIn('slug', self::STAFF_ROLE_SLUGS))
            ->exists();

        if ($isStaff) {
            return;
        }

        $isParent = ParentStudent::query()
            ->where('student_id', $student->id)
            ->where('parent_user_id', $userId)
            ->exists();

        abort_unless($isParent, 403, "Vous n'êtes pas autorisé à consulter les absences de cet élève.");
    }
}
