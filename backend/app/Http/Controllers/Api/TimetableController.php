<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Api\Concerns\AuthorizesSchoolDirecteur;
use App\Http\Controllers\Controller;
use App\Models\ClassSubjectTeacher;
use App\Models\School;
use App\Models\SchoolClass;
use App\Models\SchoolUser;
use App\Models\TimetableSlot;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

class TimetableController extends Controller
{
    use AuthorizesSchoolDirecteur;

    public function index(Request $request, School $school, SchoolClass $schoolClass)
    {
        $this->authorizeMember($request, $school);

        return response()->json(
            TimetableSlot::query()
                ->whereHas('classSubjectTeacher', fn ($query) => $query->where('class_id', $schoolClass->id))
                ->with(['classSubjectTeacher.subject', 'classSubjectTeacher.teacher'])
                ->orderBy('day_of_week')
                ->orderBy('start_time')
                ->get()
        );
    }

    /**
     * L'emploi du temps personnel du professeur connecté, toutes classes et
     * matières confondues, dans cette école.
     */
    public function mine(Request $request, School $school)
    {
        return response()->json(
            TimetableSlot::query()
                ->whereHas(
                    'classSubjectTeacher',
                    fn ($query) => $query
                        ->where('user_id', $request->user()->id)
                        ->whereHas('schoolClass', fn ($q) => $q->where('school_id', $school->id))
                )
                ->with(['classSubjectTeacher.subject', 'classSubjectTeacher.schoolClass'])
                ->orderBy('day_of_week')
                ->orderBy('start_time')
                ->get()
        );
    }

    public function store(Request $request, School $school, SchoolClass $schoolClass)
    {
        $this->authorizeDirecteur($request, $school);

        $validated = $request->validate([
            'class_subject_teacher_id' => ['required', 'uuid', 'exists:class_subject_teacher,id'],
            'day_of_week' => ['required', 'integer', 'min:1', 'max:6'],
            'start_time' => ['required', 'date_format:H:i'],
            'end_time' => ['required', 'date_format:H:i', 'after:start_time'],
            'room' => ['nullable', 'string', 'max:100'],
        ]);

        $assignment = ClassSubjectTeacher::query()
            ->where('class_id', $schoolClass->id)
            ->findOrFail($validated['class_subject_teacher_id']);

        $this->assertNoClassConflict($schoolClass, $validated);
        $this->assertNoTeacherConflict($assignment->user_id, $validated);

        $slot = TimetableSlot::query()->create([
            'class_subject_teacher_id' => $assignment->id,
            'day_of_week' => $validated['day_of_week'],
            'start_time' => $validated['start_time'],
            'end_time' => $validated['end_time'],
            'room' => $validated['room'] ?? null,
        ]);

        return response()->json($slot->load('classSubjectTeacher.subject', 'classSubjectTeacher.teacher'), 201);
    }

    public function destroy(Request $request, School $school, SchoolClass $schoolClass, TimetableSlot $slot)
    {
        $this->authorizeDirecteur($request, $school);

        abort_if($slot->classSubjectTeacher->class_id !== $schoolClass->id, 404);

        $slot->delete();

        return response()->json(status: 204);
    }

    private function assertNoClassConflict(SchoolClass $schoolClass, array $validated): void
    {
        $conflict = TimetableSlot::query()
            ->whereHas('classSubjectTeacher', fn ($query) => $query->where('class_id', $schoolClass->id))
            ->where('day_of_week', $validated['day_of_week'])
            ->where('start_time', '<', $validated['end_time'])
            ->where('end_time', '>', $validated['start_time'])
            ->exists();

        if ($conflict) {
            throw ValidationException::withMessages([
                'start_time' => ["Cette classe a déjà cours sur ce créneau."],
            ]);
        }
    }

    private function assertNoTeacherConflict(string $teacherId, array $validated): void
    {
        $conflict = TimetableSlot::query()
            ->whereHas('classSubjectTeacher', fn ($query) => $query->where('user_id', $teacherId))
            ->where('day_of_week', $validated['day_of_week'])
            ->where('start_time', '<', $validated['end_time'])
            ->where('end_time', '>', $validated['start_time'])
            ->exists();

        if ($conflict) {
            throw ValidationException::withMessages([
                'start_time' => ["Ce professeur enseigne déjà ailleurs sur ce créneau."],
            ]);
        }
    }

    private function authorizeMember(Request $request, School $school): void
    {
        $belongs = SchoolUser::query()
            ->where('school_id', $school->id)
            ->where('user_id', $request->user()->id)
            ->exists();

        if (! $belongs) {
            abort(403, "Vous n'appartenez pas à cette école.");
        }
    }
}
