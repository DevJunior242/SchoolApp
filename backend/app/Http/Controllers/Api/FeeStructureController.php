<?php

namespace App\Http\Controllers\Api;

use App\Models\School;
use App\Models\SchoolUser;
use App\Models\FeeStructure;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use App\Http\Controllers\Controller;
use Illuminate\Validation\ValidationException;
use App\Http\Controllers\Api\Concerns\ValidatesSchoolSection;
use App\Http\Controllers\Api\Concerns\AuthorizesSchoolDirecteur;

class FeeStructureController extends Controller
{
    use AuthorizesSchoolDirecteur, ValidatesSchoolSection;

    public function index(Request $request, School $school)
    {
      $this->authorizeMember($request, $school);
$sectionIds = $this->restrictedSectionIds($request, $school);

$currentYear = $school->schoolYears()->where('is_current', true)->first();

$query = FeeStructure::query()
    ->select('fee_structures.*')
    ->where('fee_structures.school_id', $school->id)
    ->when($currentYear, fn($q) => $q->where('fee_structures.school_year_id', $currentYear->id))
    ->leftJoin('levels', 'levels.id', '=', 'fee_structures.level_id')
    ->leftJoin('school_sections', function ($join) use ($school) {
        $join->on('school_sections.section_id', '=', 'levels.section_id')
             ->where('school_sections.school_id', $school->id)
             ->where('school_sections.active', true);
    })
    ->where(fn($q) => $q
        ->whereNull('fee_structures.level_id')
        ->orWhereNotNull('school_sections.school_id')
    )
    ->when($request->query('level_id'), fn($q, $levelId) => $q->where('fee_structures.level_id', $levelId))
    ->when($request->query('category'), fn($q, $category) => $q->where('fee_structures.category', $category))
    ->when($request->query('fee_category_id'), fn($q, $feeCategoryId) => $q->where('fee_structures.fee_category_id', $feeCategoryId))
    ->when($sectionIds, fn($q, $ids) => $q->where(fn($sq) => $sq
        ->whereNull('fee_structures.level_id')
        ->orWhereIn('levels.section_id', $ids)
    ))
    ->with('level', 'season', 'feeCategory')
    ->orderBy('fee_structures.order')
    ->distinct();

return response()->json($query->get());
    }

    /**
     * Un abonnement cantine est un FeeStructure rattaché à une saison
     * plutôt qu'à un niveau (category = CATEGORY_CAFETERIA_SUBSCRIPTION) :
     * même circuit de paiement/confirmation que la scolarité.
     */
    public function store(Request $request, School $school)
    {
        $this->authorizeRoles($request, $school, ['directeur', 'comptable','fondateur'], 'Seuls le directeur et le comptable peuvent gérer les frais de scolarité.');

        $validated = $request->validate([
            'category' => ['nullable', 'in:'.implode(',', [
                FeeStructure::CATEGORY_TUITION,
                FeeStructure::CATEGORY_CAFETERIA_SUBSCRIPTION,
                FeeStructure::CATEGORY_CUSTOM,
            ])],
            'fee_category_id' => [
                'required_if:category,'.FeeStructure::CATEGORY_CUSTOM,
                'nullable',
                'uuid',
                Rule::exists('fee_categories', 'id')->where('school_id', $school->id),
            ],
            'level_id' => ['required_if:category,'.FeeStructure::CATEGORY_TUITION, 'nullable', 'uuid', 'exists:levels,id'],
            'season_id' => [
                'required_if:category,'.FeeStructure::CATEGORY_CAFETERIA_SUBSCRIPTION,
                'nullable',
                'uuid',
                Rule::exists('seasons', 'id')->where('school_id', $school->id),
            ],
            'label' => ['required', 'string', 'max:255'],
            'amount' => ['required', 'numeric', 'min:0'],
            'due_date' => ['nullable', 'date'],
            'order' => ['nullable', 'integer', 'min:1'],
        ]);

        $category = $validated['category'] ?? FeeStructure::CATEGORY_TUITION;
        $level = $this->activeSchoolLevel($school, $validated['level_id'] ?? null);
        if ($level) {
            $this->authorizeLevelSection($request, $school, $level);
        }
        $currentYear = $school->schoolYears()->where('is_current', true)->first();

        if (! $currentYear) {
            throw ValidationException::withMessages([
                'school_year' => ["Aucune année scolaire active n'est configurée pour cette école."],
            ]);
        }

        $feeStructure = FeeStructure::query()->create([
            ...$validated,
            'category' => $category,
            'school_id' => $school->id,
            'school_year_id' => $currentYear->id,
            'order' => $validated['order'] ?? ($category === FeeStructure::CATEGORY_TUITION
                ? ($school->feeStructures()->where('level_id', $validated['level_id'])->count() + 1)
                : null),
        ]);

        return response()->json($feeStructure->load('level', 'season', 'feeCategory'), 201);
    }

    public function destroy(Request $request, School $school, FeeStructure $feeStructure)
    {
        $this->authorizeRoles($request, $school, ['directeur', 'comptable'], 'Seuls le directeur et le comptable peuvent gérer les frais de scolarité.');
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
