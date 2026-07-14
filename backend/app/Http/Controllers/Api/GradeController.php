<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ClassStudent;
use App\Models\ClassSubjectTeacher;
use App\Models\Grade;
use App\Models\SchoolUser;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

class GradeController extends Controller
{
    public function students(Request $request, ClassSubjectTeacher $assignment)
    {
        $this->authorize($request, $assignment);

        return response()->json(
            ClassStudent::query()
                ->where('class_id', $assignment->class_id)
                ->where('season_id', $assignment->season_id)
                ->with('student')
                ->get()
        );
    }

    public function index(Request $request, ClassSubjectTeacher $assignment)
    {
        $this->authorize($request, $assignment);

        return response()->json(
            $assignment->grades()->with('student')->orderByDesc('graded_at')->get()
        );
    }

    public function store(Request $request, ClassSubjectTeacher $assignment)
    {
        $this->authorize($request, $assignment);

        $validated = $request->validate([
            'student_id' => ['required', 'uuid'],
            'evaluation_type' => ['required', 'in:'.implode(',', [
                Grade::TYPE_DEVOIR, Grade::TYPE_INTERROGATION, Grade::TYPE_COMPOSITION, Grade::TYPE_EXAMEN,
            ])],
            'title' => ['nullable', 'string', 'max:255'],
            'score' => ['required', 'numeric', 'min:0'],
            'max_score' => ['nullable', 'numeric', 'min:1'],
            'coefficient' => ['nullable', 'numeric', 'min:0.1'],
            'graded_at' => ['nullable', 'date'],
        ]);

        $isEnrolled = ClassStudent::query()
            ->where('class_id', $assignment->class_id)
            ->where('season_id', $assignment->season_id)
            ->where('student_id', $validated['student_id'])
            ->exists();

        if (! $isEnrolled) {
            throw ValidationException::withMessages([
                'student_id' => ["Cet élève n'est pas inscrit dans cette classe pour cette saison."],
            ]);
        }

        $maxScore = $validated['max_score'] ?? 20;

        if ($validated['score'] > $maxScore) {
            throw ValidationException::withMessages([
                'score' => ["La note ne peut pas dépasser le barème ({$maxScore})."],
            ]);
        }

        $grade = $assignment->grades()->create([
            'student_id' => $validated['student_id'],
            'evaluation_type' => $validated['evaluation_type'],
            'title' => $validated['title'] ?? null,
            'score' => $validated['score'],
            'max_score' => $maxScore,
            'coefficient' => $validated['coefficient'] ?? Grade::DEFAULT_COEFFICIENTS[$validated['evaluation_type']],
            'graded_at' => $validated['graded_at'] ?? now(),
        ]);

        return response()->json($grade->load('student'), 201);
    }

    public function destroy(Request $request, ClassSubjectTeacher $assignment, Grade $grade)
    {
        $this->authorize($request, $assignment);

        abort_if($grade->class_subject_teacher_id !== $assignment->id, 404);

        $grade->delete();

        return response()->json(status: 204);
    }

    private function authorize(Request $request, ClassSubjectTeacher $assignment): void
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

        abort_unless($isDirecteur, 403, "Vous n'êtes pas autorisé à gérer les notes de cette classe.");
    }
}
