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
                ->when($request->query('category'), fn ($query, $category) => $query->where('category', $category))
                ->with('level', 'season')
                ->orderBy('order')
                ->get()
        );
    }

    /**
     * Un abonnement cantine est un FeeStructure rattaché à une saison
     * plutôt qu'à un niveau (category = CATEGORY_CAFETERIA_SUBSCRIPTION) :
     * même circuit de paiement/confirmation que la scolarité.
     */
    public function store(Request $request, School $school)
    {
        $this->authorizeRoles($request, $school, ['directeur', 'comptable'], "Seuls le directeur et le comptable peuvent gérer les frais de scolarité.");

        $validated = $request->validate([
            'category' => ['nullable', 'in:'.FeeStructure::CATEGORY_TUITION.','.FeeStructure::CATEGORY_CAFETERIA_SUBSCRIPTION],
            'level_id' => ['required_if:category,'.FeeStructure::CATEGORY_TUITION, 'nullable', 'uuid', 'exists:levels,id'],
            'season_id' => ['required_if:category,'.FeeStructure::CATEGORY_CAFETERIA_SUBSCRIPTION, 'nullable', 'uuid', 'exists:seasons,id'],
            'label' => ['required', 'string', 'max:255'],
            'amount' => ['required', 'numeric', 'min:0'],
            'due_date' => ['nullable', 'date'],
            'order' => ['nullable', 'integer', 'min:1'],
        ]);

        $category = $validated['category'] ?? FeeStructure::CATEGORY_TUITION;
        $currentYear = $school->schoolYears()->where('is_current', true)->firstOrFail();

        $feeStructure = FeeStructure::query()->create([
            ...$validated,
            'category' => $category,
            'school_id' => $school->id,
            'school_year_id' => $currentYear->id,
            'order' => $validated['order'] ?? ($category === FeeStructure::CATEGORY_TUITION
                ? ($school->feeStructures()->where('level_id', $validated['level_id'])->count() + 1)
                : null),
        ]);

        return response()->json($feeStructure->load('level', 'season'), 201);
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
