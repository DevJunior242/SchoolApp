<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Exam;
use App\Models\ExamSubject;
use App\Models\School;
use App\Models\Subject;
use Illuminate\Http\Request;

class ExamSubjectController extends Controller
{
    public function index(School $school, Exam $exam)
    {
        abort_unless($exam->school_id === $school->id, 404);

        return response()->json(
            $exam->examSubjects()
                ->with(['subject', 'schoolClass.level.section'])
                ->orderBy('order')
                ->get()
        );
    }

    public function store(Request $request, School $school, Exam $exam)
    {
        abort_unless($exam->school_id === $school->id, 404);

        $validated = $request->validate([
            'subject_id' => ['required', 'uuid', 'exists:subjects,id'],
            'school_class_id' => ['nullable', 'uuid', 'exists:classes,id'],
            'coefficient' => ['nullable', 'integer', 'min:1'],
            'max_score' => ['nullable', 'integer', 'min:1'],
            'order' => ['nullable', 'integer', 'min:0'],
            'is_mandatory' => ['nullable', 'boolean'],
            'exam_date' => ['nullable', 'date'],
            'start_time' => ['nullable', 'date_format:H:i'],
            'end_time' => ['nullable', 'date_format:H:i'],
        ]);

        abort_unless(Subject::query()->where('id', $validated['subject_id'])->exists(), 404);

        if ($exam->exam_mode === 'passage' && empty($validated['school_class_id'])) {
            abort(422, 'Le programme d’un examen de passage doit être associé à une classe.');
        }

        $examSubject = ExamSubject::query()->create([
            'exam_id' => $exam->id,
            'school_class_id' => $validated['school_class_id'] ?? null,
            'subject_id' => $validated['subject_id'],
            'coefficient' => $validated['coefficient'] ?? 1,
            'max_score' => $validated['max_score'] ?? 20,
            'order' => $validated['order'] ?? 0,
            'is_mandatory' => $validated['is_mandatory'] ?? true,
            'exam_date' => $validated['exam_date'] ?? null,
            'start_time' => $validated['start_time'] ?? null,
            'end_time' => $validated['end_time'] ?? null,
        ]);

        return response()->json($examSubject->load(['subject', 'schoolClass.level.section']), 201);
    }

    public function update(Request $request, School $school, Exam $exam, ExamSubject $examSubject)
    {
        abort_unless($exam->school_id === $school->id, 404);
        abort_unless($examSubject->exam_id === $exam->id, 404);

        $validated = $request->validate([
            'subject_id' => ['sometimes', 'required', 'uuid', 'exists:subjects,id'],
            'school_class_id' => ['nullable', 'uuid', 'exists:classes,id'],
            'coefficient' => ['nullable', 'integer', 'min:1'],
            'max_score' => ['nullable', 'integer', 'min:1'],
            'order' => ['nullable', 'integer', 'min:0'],
            'is_mandatory' => ['nullable', 'boolean'],
            'exam_date' => ['nullable', 'date'],
            'start_time' => ['nullable', 'date_format:H:i'],
            'end_time' => ['nullable', 'date_format:H:i'],
        ]);

        if ($exam->exam_mode === 'passage' && empty($validated['school_class_id'] ?? $examSubject->school_class_id)) {
            abort(422, 'Le programme d’un examen de passage doit être associé à une classe.');
        }

        $examSubject->update($validated);

        return response()->json($examSubject->fresh()->load(['subject', 'schoolClass.level.section']));
    }

    public function destroy(School $school, Exam $exam, ExamSubject $examSubject)
    {
        abort_unless($exam->school_id === $school->id, 404);
        abort_unless($examSubject->exam_id === $exam->id, 404);

        $examSubject->delete();

        return response()->json(['message' => 'Épreuve supprimée.']);
    }
}
