<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ExamType;
use App\Models\School;
use App\Models\SchoolUser;
use App\Services\SchoolAdminPermissionService;
use Illuminate\Http\Request;

class ExamTypeController extends Controller
{
    public function index(School $school)
    {
        return response()->json(
            ExamType::query()
                ->where('school_id', $school->id)
                ->orderBy('name')
                ->get()
        );
    }

    public function store(Request $request, School $school)
    {
        $this->authorizeExamForm($request, $school);
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'code' => ['nullable', 'string', 'max:50'],
            'description' => ['nullable', 'string'],
            'is_active' => ['nullable', 'boolean'],
        ]);

        if (isset($validated['name']) && trim((string) $validated['name']) === '') {
            abort(422, 'Le nom du type d’examen est requis.');
        }

        $examType = ExamType::query()->create([
            'school_id' => $school->id,
            'name' => $validated['name'],
            'code' => $validated['code'] ?? null,
            'description' => $validated['description'] ?? null,
            'is_active' => $validated['is_active'] ?? true,
        ]);

        return response()->json($examType, 201);
    }

    public function update(Request $request, School $school, ExamType $examType)
    {
        abort_unless($examType->school_id === $school->id, 404);
        $this->authorizeExamForm($request, $school);

        $validated = $request->validate([
            'name' => ['sometimes', 'required', 'string', 'max:255'],
            'code' => ['nullable', 'string', 'max:50'],
            'description' => ['nullable', 'string'],
            'is_active' => ['nullable', 'boolean'],
        ]);

        if (isset($validated['name']) && trim((string) $validated['name']) === '') {
            abort(422, 'Le nom du type d’examen est requis.');
        }

        $examType->update($validated);

        return response()->json($examType->fresh());
    }

    public function destroy(School $school, ExamType $examType)
    {
        abort_unless($examType->school_id === $school->id, 404);
        $this->authorizeExamForm(request(), $school);

        $examType->delete();

        return response()->json(['message' => 'Type d’examen supprimé.']);
    }

    private function authorizeExamForm(Request $request, School $school): void
    {
        $actor = SchoolUser::query()
            ->with(['role', 'sections'])
            ->where('school_id', $school->id)
            ->where('user_id', $request->user()?->id)
            ->first();

        abort_unless(
            app(SchoolAdminPermissionService::class)->isAdmin($actor),
            403,
            'Seuls les administrateurs de l’école peuvent gérer les types d’examen.',
        );
    }
}
