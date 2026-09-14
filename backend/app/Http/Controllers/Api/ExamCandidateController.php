<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ClassStudent;
use App\Models\ClassSubjectTeacher;
use App\Models\Exam;
use App\Models\ExamCandidate;
use App\Models\School;
use App\Models\SchoolClass;
use App\Models\SchoolStudent;
use App\Models\SchoolUser;
use App\Models\Student;
use Illuminate\Http\Request;
use Illuminate\Support\Arr;

class ExamCandidateController extends Controller
{
    public function index(Request $request, School $school, Exam $exam)
    {
        abort_unless($exam->school_id === $school->id, 404);

        $candidateQuery = $exam->examCandidates()
            ->with(['student', 'schoolClass.level.section'])
            ->orderBy('created_at');

        $teacherClassIds = $this->teacherClassIds($request, $school);

        if ($teacherClassIds !== null) {
            $candidateQuery->whereIn('school_class_id', $teacherClassIds);
        }

        return response()->json($candidateQuery->get());
    }

    public function generate(Request $request, School $school, Exam $exam)
    {
        abort_unless($exam->school_id === $school->id, 404);

        $validated = $request->validate([
            'school_class_ids' => ['nullable', 'array'],
            'school_class_ids.*' => ['uuid', 'exists:classes,id'],
        ]);

        $requestedClassIds = array_values(array_unique(Arr::get($validated, 'school_class_ids', [])));

        if (empty($requestedClassIds)) {
            $targetClasses = $exam->examTargets()
                ->with('level', 'section', 'schoolClass')
                ->get()
                ->flatMap(function ($target) use ($school) {
                    return match ($target->target_type) {
                        'section' => SchoolClass::query()
                            ->where('school_id', $school->id)
                            ->whereHas('level', fn($query) => $query->where('section_id', $target->section_id))
                            ->pluck('id')
                            ->all(),
                        'level' => SchoolClass::query()
                            ->where('school_id', $school->id)
                            ->where('level_id', $target->level_id)
                            ->pluck('id')
                            ->all(),
                        'class' => $target->school_class_id ? [$target->school_class_id] : [],
                        default => [],
                    };
                })
                ->unique()
                ->values()
                ->all();
        } else {
            $targetClasses = SchoolClass::query()
                ->where('school_id', $school->id)
                ->whereIn('id', $requestedClassIds)
                ->pluck('id')
                ->all();
        }

        if (empty($targetClasses)) {
            abort(422, 'Aucune classe n’a été sélectionnée pour générer les candidats.');
        }

        $studentIds = ClassStudent::query()
            ->where('status', ClassStudent::STATUS_ACTIVE)
            ->whereIn('class_id', $targetClasses)
            ->select('student_id')
            ->get()
            ->pluck('student_id')
            ->unique()
            ->values()
            ->all();

        if (empty($studentIds)) {
            return response()->json([
                'created' => 0,
                'existing' => 0,
                'candidates' => [],
                'message' => 'Aucun élève actif n’a été trouvé dans les classes ciblées.',
            ]);
        }

        $existingCandidates = ExamCandidate::query()
            ->where('exam_id', $exam->id)
            ->get()
            ->keyBy('student_id');

        $createdCandidates = [];

        foreach ($studentIds as $studentId) {
            if ($existingCandidates->has($studentId)) {
                continue;
            }

            $schoolClassId = ClassStudent::query()
                ->where('student_id', $studentId)
                ->where('status', ClassStudent::STATUS_ACTIVE)
                ->whereIn('class_id', $targetClasses)
                ->orderByDesc('created_at')
                ->value('class_id');

            $candidateNumber = $this->buildCandidateNumber($exam);

            $candidate = ExamCandidate::query()->create([
                'exam_id' => $exam->id,
                'student_id' => $studentId,
                'school_class_id' => $schoolClassId,
                'candidate_number' => $candidateNumber,
                'attendance_status' => 'present',
                'is_absent' => false,
            ]);

            $createdCandidates[] = $candidate->load(['student', 'schoolClass.level.section']);
        }

        $existingCount = count($existingCandidates);

        return response()->json([
            'created' => count($createdCandidates),
            'existing' => $existingCount,
            'candidates' => array_merge(
                $createdCandidates,
                $existingCandidates
                    ->values()
                    ->map(fn($candidate) => $candidate->load(['student', 'schoolClass.level.section']))
                    ->all()
            ),
            'message' => sprintf(
                '%d candidat(s) ajouté(s) à l’examen. %d candidat(s) existaient déjà.',
                count($createdCandidates),
                $existingCount
            ),
        ], 201);
    }

    private function buildCandidateNumber(Exam $exam): string
    {
        $sequence = ExamCandidate::query()
            ->where('exam_id', $exam->id)
            ->whereNotNull('candidate_number')
            ->count() + 1;

        return sprintf('CAN-%04d', $sequence);
    }

    public function store(Request $request, School $school, Exam $exam)
    {
        abort_unless($exam->school_id === $school->id, 404);

        $validated = $request->validate([
            'student_id' => ['required', 'uuid', 'exists:students,id'],
            'school_class_id' => ['nullable', 'uuid', 'exists:classes,id'],
            'candidate_number' => ['nullable', 'string', 'max:50'],
            'attendance_status' => ['nullable', 'string', 'max:50'],
            'is_absent' => ['nullable', 'boolean'],
            'remarks' => ['nullable', 'string'],
        ]);

        $student = Student::query()->findOrFail($validated['student_id']);
        $belongsToSchool = SchoolStudent::query()
            ->where('school_id', $school->id)
            ->where('student_id', $student->id)
            ->exists();

        abort_unless($belongsToSchool, 404, 'Cet élève n’appartient pas à cette école.');

        if (! empty($validated['school_class_id'])) {
            $classBelongsToSchool = SchoolClass::query()
                ->where('id', $validated['school_class_id'])
                ->where('school_id', $school->id)
                ->exists();

            abort_unless($classBelongsToSchool, 404, 'Cette classe n’appartient pas à cette école.');
        }

        $candidate = ExamCandidate::query()->create([
            'exam_id' => $exam->id,
            'student_id' => $validated['student_id'],
            'school_class_id' => $validated['school_class_id'] ?? null,
            'candidate_number' => $validated['candidate_number'] ?? null,
            'attendance_status' => $validated['attendance_status'] ?? 'present',
            'is_absent' => $validated['is_absent'] ?? false,
            'remarks' => $validated['remarks'] ?? null,
        ]);

        return response()->json($candidate->load(['student', 'schoolClass.level.section']), 201);
    }

    public function update(Request $request, School $school, Exam $exam, ExamCandidate $candidate)
    {
        abort_unless($exam->school_id === $school->id, 404);
        abort_unless($candidate->exam_id === $exam->id, 404);

        $validated = $request->validate([
            'school_class_id' => ['nullable', 'uuid', 'exists:classes,id'],
            'candidate_number' => ['nullable', 'string', 'max:50'],
            'attendance_status' => ['nullable', 'string', 'max:50'],
            'is_absent' => ['nullable', 'boolean'],
            'remarks' => ['nullable', 'string'],
        ]);

        $candidate->update($validated);

        return response()->json($candidate->fresh()->load(['student', 'schoolClass.level.section']));
    }

    public function destroy(School $school, Exam $exam, ExamCandidate $candidate)
    {
        abort_unless($exam->school_id === $school->id, 404);
        abort_unless($candidate->exam_id === $exam->id, 404);

        $candidate->delete();

        return response()->json(['message' => 'Candidat supprimé de l’examen.']);
    }

    private function teacherClassIds(Request $request, School $school): ?array
    {
        $user = $request->user();

        if (! $user) {
            return [];
        }

        if ($this->isDirectorOrFounder($request, $school)) {
            return null;
        }

        return ClassSubjectTeacher::query()
            ->where('user_id', $user->id)
            ->whereHas('schoolClass', fn($query) => $query->where('school_id', $school->id))
            ->pluck('class_id')
            ->unique()
            ->values()
            ->all();
    }

    private function isDirectorOrFounder(Request $request, School $school): bool
    {
        $user = $request->user();

        if (! $user) {
            return false;
        }

        return SchoolUser::query()
            ->where('school_id', $school->id)
            ->where('user_id', $user->id)
            ->whereHas('role', fn($query) => $query->whereIn('slug', ['directeur', 'fondateur']))
            ->exists();
    }
}
