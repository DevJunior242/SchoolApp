<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Api\Concerns\AuthorizesSchoolDirecteur;
use App\Http\Controllers\Controller;
use App\Models\FeeStructure;
use App\Models\School;
use App\Models\SchoolUser;
use Illuminate\Http\Request;

class FeeStructureController extends Controller
{
    use AuthorizesSchoolDirecteur;

    public function index(Request $request, School $school)
    {
        $this->authorizeMember($request, $school);

        $currentYear = $school->schoolYears()->where('is_current', true)->first();

        return response()->json(
            FeeStructure::query()
                ->where('school_id', $school->id)
                ->when($currentYear, fn ($query) => $query->where('school_year_id', $currentYear->id))
                ->when($request->query('level_id'), fn ($query, $levelId) => $query->where('level_id', $levelId))
                ->with('level')
                ->orderBy('order')
                ->get()
        );
    }

    public function store(Request $request, School $school)
    {
        $this->authorizeRoles($request, $school, ['directeur', 'comptable'], "Seuls le directeur et le comptable peuvent gérer les frais de scolarité.");

        $validated = $request->validate([
            'level_id' => ['required', 'uuid', 'exists:levels,id'],
            'label' => ['required', 'string', 'max:255'],
            'amount' => ['required', 'numeric', 'min:0'],
            'due_date' => ['nullable', 'date'],
            'order' => ['nullable', 'integer', 'min:1'],
        ]);

        $currentYear = $school->schoolYears()->where('is_current', true)->firstOrFail();

        $feeStructure = FeeStructure::query()->create([
            ...$validated,
            'school_id' => $school->id,
            'school_year_id' => $currentYear->id,
            'order' => $validated['order'] ?? ($school->feeStructures()->where('level_id', $validated['level_id'])->count() + 1),
        ]);

        return response()->json($feeStructure->load('level'), 201);
    }

    public function destroy(Request $request, School $school, FeeStructure $feeStructure)
    {
        $this->authorizeRoles($request, $school, ['directeur', 'comptable'], "Seuls le directeur et le comptable peuvent gérer les frais de scolarité.");
        abort_if($feeStructure->school_id !== $school->id, 404);

        $feeStructure->delete();

        return response()->json(status: 204);
    }

    private function authorizeMember(Request $request, School $school): void
    {
        $belongs = SchoolUser::query()
            ->where('school_id', $school->id)
            ->where('user_id', $request->user()->id)
            ->exists();

        abort_unless($belongs, 403, "Vous n'appartenez pas à cette école.");
    }
}
