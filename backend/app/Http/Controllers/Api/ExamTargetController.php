<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Exam;
use App\Models\ExamTarget;
use App\Models\School;
use Illuminate\Http\Request;

class ExamTargetController extends Controller
{
    public function index(School $school, Exam $exam)
    {
        abort_unless($exam->school_id === $school->id, 404);

        return response()->json(
            $exam->examTargets()
                ->with(['section', 'level', 'schoolClass.level.section'])
                ->get()
        );
    }

    public function store(Request $request, School $school, Exam $exam)
    {
        abort_unless($exam->school_id === $school->id, 404);

        $validated = $request->validate([
            'section_id' => ['nullable', 'uuid', 'exists:sections,id'],
            'level_id' => ['nullable', 'uuid', 'exists:levels,id'],
            'school_class_id' => ['nullable', 'uuid', 'exists:classes,id'],
            'target_type' => ['required', 'in:section,level,class'],
            'remarks' => ['nullable', 'string'],
        ]);

        if ($validated['target_type'] === 'section' && empty($validated['section_id'])) {
            abort(422, 'La cible section nécessite un section_id.');
        }

        if ($validated['target_type'] === 'level' && empty($validated['level_id'])) {
            abort(422, 'La cible niveau nécessite un level_id.');
        }

        if ($validated['target_type'] === 'class' && empty($validated['school_class_id'])) {
            abort(422, 'La cible classe nécessite un school_class_id.');
        }

        $target = ExamTarget::query()->create([
            'exam_id' => $exam->id,
            'section_id' => $validated['section_id'] ?? null,
            'level_id' => $validated['level_id'] ?? null,
            'school_class_id' => $validated['school_class_id'] ?? null,
            'target_type' => $validated['target_type'],
            'remarks' => $validated['remarks'] ?? null,
        ]);

        return response()->json($target->load(['section', 'level', 'schoolClass.level.section']), 201);
    }

    public function update(Request $request, School $school, Exam $exam, ExamTarget $target)
    {
        abort_unless($exam->school_id === $school->id, 404);
        abort_unless($target->exam_id === $exam->id, 404);

        $validated = $request->validate([
            'section_id' => ['nullable', 'uuid', 'exists:sections,id'],
            'level_id' => ['nullable', 'uuid', 'exists:levels,id'],
            'school_class_id' => ['nullable', 'uuid', 'exists:classes,id'],
            'target_type' => ['sometimes', 'required', 'in:section,level,class'],
            'remarks' => ['nullable', 'string'],
        ]);

        $target->update($validated);

        return response()->json($target->fresh()->load(['section', 'level', 'schoolClass.level.section']));
    }

    public function destroy(School $school, Exam $exam, ExamTarget $target)
    {
        abort_unless($exam->school_id === $school->id, 404);
        abort_unless($target->exam_id === $exam->id, 404);

        $target->delete();

        return response()->json(['message' => 'Cible d’examen supprimée.']);
    }
}
