<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Api\Concerns\AuthorizesSchoolDirecteur;
use App\Http\Controllers\Controller;
use App\Models\FeeCategory;
use App\Models\School;
use App\Models\SchoolUser;
use Illuminate\Http\Request;

class FeeCategoryController extends Controller
{
    use AuthorizesSchoolDirecteur;

    public function index(Request $request, School $school)
    {
        $this->authorizeMember($request, $school);

        return response()->json(
            FeeCategory::query()
                ->where('school_id', $school->id)
                ->where('is_active', true)
                ->orderBy('name')
                ->get()
        );
    }

    public function store(Request $request, School $school)
    {
        $this->authorizeRoles($request, $school, ['directeur', 'comptable'], 'Seuls le directeur et le comptable peuvent gérer les catégories de frais.');

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
        ]);

        $category = FeeCategory::query()->create([...$validated, 'school_id' => $school->id]);

        return response()->json($category, 201);
    }

    public function update(Request $request, School $school, FeeCategory $feeCategory)
    {
        $this->authorizeRoles($request, $school, ['directeur', 'comptable'], 'Seuls le directeur et le comptable peuvent gérer les catégories de frais.');
        abort_if($feeCategory->school_id !== $school->id, 404);

        $validated = $request->validate([
            'name' => ['sometimes', 'string', 'max:255'],
            'is_active' => ['sometimes', 'boolean'],
        ]);

        $feeCategory->update($validated);

        return response()->json($feeCategory);
    }

    public function destroy(Request $request, School $school, FeeCategory $feeCategory)
    {
        $this->authorizeRoles($request, $school, ['directeur', 'comptable'], 'Seuls le directeur et le comptable peuvent gérer les catégories de frais.');
        abort_if($feeCategory->school_id !== $school->id, 404);

        $feeCategory->delete();

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
