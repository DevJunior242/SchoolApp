<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ClassSubjectTeacher;
use App\Models\Exam;
use App\Models\ExamType;
use App\Models\ParentStudent;
use App\Models\School;
use App\Models\SchoolUser;
use App\Models\SchoolYear;
use App\Models\Student;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class ExamController extends Controller
{
    public function index(Request $request, School $school)
    {
        $teacherClassIds = $this->teacherClassIds($request, $school);
        $visibilityScope = $this->visibilityScope($request, $school);

        $exams = Exam::query()
            ->where('school_id', $school->id)
            ->with([
                'examType',
                'schoolYear',
                'examTargets',
                'examSubjects.subject',
                'examSubjects.schoolClass.level.section',
                'examCandidates.student',
                'examCandidates.schoolClass.level.section',
            ])
            ->orderByDesc('start_date')
            ->get();

        if ($visibilityScope['mode'] !== 'all') {
            $exams = $exams->filter(function (Exam $exam) use ($visibilityScope) {
                return $exam->examCandidates->contains(
                    fn($candidate) => in_array($candidate->student_id, $visibilityScope['student_ids'], true),
                );
            })->values();

            $exams->each(function (Exam $exam) use ($visibilityScope) {
                $filteredCandidates = $exam->examCandidates
                    ->filter(fn($candidate) => in_array($candidate->student_id, $visibilityScope['student_ids'], true))
                    ->values();

                $exam->setRelation('examCandidates', $filteredCandidates);
            });
        }

        if ($teacherClassIds !== null) {
            $exams->each(function (Exam $exam) use ($teacherClassIds) {
                if ($exam->exam_mode === 'blanc') {
                    return;
                }

                $filteredCandidates = $exam->examCandidates
                    ->filter(fn($candidate) => in_array($candidate->school_class_id, $teacherClassIds, true))
                    ->values();

                $exam->setRelation('examCandidates', $filteredCandidates);
            });
        }

        return response()->json($exams);
    }

    public function show(Request $request, School $school, Exam $exam)
    {
        abort_unless($exam->school_id === $school->id, 404);

        $teacherClassIds = $this->teacherClassIds($request, $school);
        $visibilityScope = $this->visibilityScope($request, $school);

        $exam->load([
            'examType',
            'schoolYear',
            'examTargets.section',
            'examTargets.level',
            'examTargets.schoolClass.level.section',
            'examSubjects.subject',
            'examSubjects.schoolClass.level.section',
            'examCandidates.student',
            'examCandidates.schoolClass.level.section',
            'examResults.examCandidate.student',
        ]);

        if ($visibilityScope['mode'] !== 'all') {
            $allowedStudentIds = $visibilityScope['student_ids'];

            $hasRelevantCandidate = $exam->examCandidates->contains(
                fn($candidate) => in_array($candidate->student_id, $allowedStudentIds, true),
            );

            abort_unless($hasRelevantCandidate, 404, 'Cet examen n’est pas disponible pour cet utilisateur.');

            $filteredCandidates = $exam->examCandidates
                ->filter(fn($candidate) => in_array($candidate->student_id, $allowedStudentIds, true))
                ->values();

            $exam->setRelation('examCandidates', $filteredCandidates);
        }

        if ($teacherClassIds !== null && $exam->exam_mode !== 'blanc') {
            $filteredCandidates = $exam->examCandidates
                ->filter(fn($candidate) => in_array($candidate->school_class_id, $teacherClassIds, true))
                ->values();

            $exam->setRelation('examCandidates', $filteredCandidates);
        }

        return response()->json($exam);
    }

    public function store(Request $request, School $school)
    {
        $validated = $request->validate([
            'school_year_id' => ['nullable', 'uuid', 'exists:school_years,id'],
            'exam_type_id' => ['required', 'uuid', 'exists:exam_types,id'],
            'exam_mode' => ['nullable', 'string', 'in:passage,blanc'],
            'name' => ['required', 'string', 'max:255'],
            'slug' => ['nullable', 'string', 'max:255'],
            'start_date' => ['nullable', 'date'],
            'end_date' => ['nullable', 'date', 'after_or_equal:start_date'],
            'status' => ['nullable', 'string', 'max:50'],
            'is_published' => ['nullable', 'boolean'],
            'remarks' => ['nullable', 'string'],
        ]);

        if (trim((string) $validated['name']) === '') {
            abort(422, 'Le nom de l’examen est requis.');
        }

        abort_unless(ExamType::query()->where('id', $validated['exam_type_id'])->where('school_id', $school->id)->exists(), 404);

        if (! empty($validated['school_year_id'])) {
            abort_unless(SchoolYear::query()->where('id', $validated['school_year_id'])->where('school_id', $school->id)->exists(), 404);
        }

        $exam = Exam::query()->create([
            'school_id' => $school->id,
            'school_year_id' => $validated['school_year_id'] ?? null,
            'exam_type_id' => $validated['exam_type_id'],
            'exam_mode' => $validated['exam_mode'] ?? 'passage',
            'name' => $validated['name'],
            'slug' => $validated['slug'] ?? Str::slug($validated['name']),
            'start_date' => $validated['start_date'] ?? null,
            'end_date' => $validated['end_date'] ?? null,
            'status' => $validated['status'] ?? 'draft',
            'is_published' => $validated['is_published'] ?? false,
            'remarks' => $validated['remarks'] ?? null,
        ]);

        return response()->json($exam->load('examType', 'schoolYear'), 201);
    }

    public function update(Request $request, School $school, Exam $exam)
    {
        abort_unless($exam->school_id === $school->id, 404);

        $validated = $request->validate([
            'school_year_id' => ['nullable', 'uuid', 'exists:school_years,id'],
            'exam_type_id' => ['sometimes', 'required', 'uuid', 'exists:exam_types,id'],
            'exam_mode' => ['nullable', 'string', 'in:passage,blanc'],
            'name' => ['sometimes', 'required', 'string', 'max:255'],
            'slug' => ['nullable', 'string', 'max:255'],
            'start_date' => ['nullable', 'date'],
            'end_date' => ['nullable', 'date', 'after_or_equal:start_date'],
            'status' => ['nullable', 'string', 'max:50'],
            'is_published' => ['nullable', 'boolean'],
            'remarks' => ['nullable', 'string'],
        ]);

        if (isset($validated['name']) && trim((string) $validated['name']) === '') {
            abort(422, 'Le nom de l’examen est requis.');
        }

        if (! empty($validated['exam_type_id'])) {
            abort_unless(ExamType::query()->where('id', $validated['exam_type_id'])->where('school_id', $school->id)->exists(), 404);
        }

        if (! empty($validated['school_year_id'])) {
            abort_unless(SchoolYear::query()->where('id', $validated['school_year_id'])->where('school_id', $school->id)->exists(), 404);
        }

        $exam->update($validated);

        return response()->json($exam->fresh()->load('examType', 'schoolYear'));
    }

    public function destroy(School $school, Exam $exam)
    {
        abort_unless($exam->school_id === $school->id, 404);

        $exam->delete();

        return response()->json(['message' => 'Examen supprimé.']);
    }

    private function teacherClassIds(Request $request, School $school): ?array
    {
        $user = $request->user();

        if (! $user) {
            return [];
        }

        $roleSlug = $this->roleSlug($request, $school);

        if (in_array($roleSlug, ['eleve', 'parent'], true)) {
            return null;
        }

        if ($this->isDirectorOrFounder($request, $school)) {
            return null;
        }

        if ($roleSlug !== 'professeur') {
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

    private function visibilityScope(Request $request, School $school): array
    {
        $user = $request->user();

        if (! $user) {
            return ['mode' => 'all', 'student_ids' => []];
        }

        $roleSlug = $this->roleSlug($request, $school);

        if ($roleSlug === 'eleve') {
            $studentIds = Student::query()
                ->where('user_id', $user->id)
                ->pluck('id')
                ->values()
                ->all();

            return ['mode' => 'student', 'student_ids' => $studentIds];
        }

        if ($roleSlug === 'parent') {
            $studentIds = ParentStudent::query()
                ->where('parent_user_id', $user->id)
                ->pluck('student_id')
                ->unique()
                ->values()
                ->all();

            return ['mode' => 'parent', 'student_ids' => $studentIds];
        }

        return ['mode' => 'all', 'student_ids' => []];
    }

    private function roleSlug(Request $request, School $school): ?string
    {
        $user = $request->user();

        if (! $user) {
            return null;
        }

        return SchoolUser::query()
            ->where('school_id', $school->id)
            ->where('user_id', $user->id)
            ->with('role')
            ->first()?->role?->slug;
    }
}
