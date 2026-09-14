<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ClassSubjectTeacher;
use App\Models\Exam;
use App\Models\ExamCandidate;
use App\Models\ExamCandidateSubject;
use App\Models\ExamSubject;
use App\Models\School;
use App\Models\SchoolUser;
use Illuminate\Http\Request;

class ExamCandidateSubjectController extends Controller
{
    public function index(Request $request, School $school, Exam $exam, ExamCandidate $candidate)
    {
        abort_unless($exam->school_id === $school->id, 404);
        abort_unless($candidate->exam_id === $exam->id, 404);

        $this->authorizeTeacherForCandidate($request, $school, $exam, $candidate);

        return response()->json(
            $candidate->examCandidateSubjects()
                ->with('examSubject.subject')
                ->orderBy('created_at')
                ->get()
        );
    }

    public function store(Request $request, School $school, Exam $exam, ExamCandidate $candidate)
    {
        abort_unless($exam->school_id === $school->id, 404);
        abort_unless($candidate->exam_id === $exam->id, 404);

        $validated = $request->validate([
            'exam_subject_id' => ['required', 'uuid', 'exists:exam_subjects,id'],
            'score' => ['nullable', 'numeric'],
            'score_out_of' => ['nullable', 'numeric'],
            'is_absent' => ['nullable', 'boolean'],
            'remark' => ['nullable', 'string'],
            'validated_at' => ['nullable', 'date'],
        ]);

        $examSubject = ExamSubject::query()->findOrFail($validated['exam_subject_id']);
        abort_unless($examSubject->exam_id === $exam->id, 422, 'Cette épreuve n’appartient pas à cet examen.');

        $this->authorizeTeacherForExamSubject($request, $school, $exam, $candidate, $examSubject);

        $candidateSubject = ExamCandidateSubject::query()->create([
            'exam_candidate_id' => $candidate->id,
            'exam_subject_id' => $validated['exam_subject_id'],
            'score' => $validated['score'] ?? null,
            'score_out_of' => $validated['score_out_of'] ?? null,
            'is_absent' => $validated['is_absent'] ?? false,
            'remark' => $validated['remark'] ?? null,
            'validated_at' => $validated['validated_at'] ?? null,
        ]);

        return response()->json($candidateSubject->load('examSubject.subject'), 201);
    }

    public function update(Request $request, School $school, Exam $exam, ExamCandidate $candidate, ExamCandidateSubject $candidateSubject)
    {
        abort_unless($exam->school_id === $school->id, 404);
        abort_unless($candidate->exam_id === $exam->id, 404);
        abort_unless($candidateSubject->exam_candidate_id === $candidate->id, 404);

        $examSubject = $candidateSubject->examSubject()->first();
        abort_unless($examSubject && $examSubject->exam_id === $exam->id, 422, 'Cette note n’appartient pas à cet examen.');

        $this->authorizeTeacherForExamSubject($request, $school, $exam, $candidate, $examSubject);

        $validated = $request->validate([
            'score' => ['nullable', 'numeric'],
            'score_out_of' => ['nullable', 'numeric'],
            'is_absent' => ['nullable', 'boolean'],
            'remark' => ['nullable', 'string'],
            'validated_at' => ['nullable', 'date'],
        ]);

        $candidateSubject->update($validated);

        return response()->json($candidateSubject->fresh()->load('examSubject.subject'));
    }

    public function destroy(School $school, Exam $exam, ExamCandidate $candidate, ExamCandidateSubject $candidateSubject)
    {
        abort_unless($exam->school_id === $school->id, 404);
        abort_unless($candidate->exam_id === $exam->id, 404);
        abort_unless($candidateSubject->exam_candidate_id === $candidate->id, 404);

        $examSubject = $candidateSubject->examSubject()->first();
        abort_unless($examSubject && $examSubject->exam_id === $exam->id, 422, 'Cette note n’appartient pas à cet examen.');

        $this->authorizeTeacherForExamSubject(request(), $school, $exam, $candidate, $examSubject);

        $candidateSubject->delete();

        return response()->json(['message' => 'Note supprimée.']);
    }

    private function authorizeTeacherForExamSubject(Request $request, School $school, Exam $exam, ExamCandidate $candidate, ExamSubject $examSubject): void
    {
        $user = $request->user();
        $userId = $user?->id;

        if (! $userId) {
            abort(401, 'Authentification requise.');
        }

        if ($this->isDirectorOrFounder($request, $school)) {
            return;
        }

        if ($exam->exam_mode === 'blanc') {
            $isTeacherForSubject = ClassSubjectTeacher::query()
                ->where('user_id', $userId)
                ->where('subject_id', $examSubject->subject_id)
                ->exists();

            abort_unless($isTeacherForSubject, 403, 'Vous n’êtes pas autorisé à noter cette matière pour un examen blanc.');

            return;
        }

        if (! $candidate->school_class_id) {
            abort(403, 'Aucune classe n’est associée à ce candidat.');
        }

        $isTeacherForSubject = ClassSubjectTeacher::query()
            ->where('user_id', $userId)
            ->where('class_id', $candidate->school_class_id)
            ->where('subject_id', $examSubject->subject_id)
            ->exists();

        abort_unless($isTeacherForSubject, 403, 'Vous n’êtes pas autorisé à noter cette matière pour ce candidat.');
    }

    private function authorizeTeacherForCandidate(Request $request, School $school, Exam $exam, ExamCandidate $candidate): void
    {
        $user = $request->user();
        $userId = $user?->id;

        if (! $userId) {
            abort(401, 'Authentification requise.');
        }

        if ($this->isDirectorOrFounder($request, $school)) {
            return;
        }

        if ($exam->exam_mode === 'blanc') {
            return;
        }

        if (! $candidate->school_class_id) {
            abort(403, 'Aucune classe n’est associée à ce candidat.');
        }

        $isTeacherForClass = ClassSubjectTeacher::query()
            ->where('user_id', $userId)
            ->where('class_id', $candidate->school_class_id)
            ->exists();

        abort_unless($isTeacherForClass, 403, 'Vous ne pouvez voir que les élèves de vos classes enseignées.');
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
