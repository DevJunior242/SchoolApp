<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Api\Concerns\AuthorizesSchoolDirecteur;
use App\Http\Controllers\Controller;
use App\Models\ExpenseCategory;
use App\Models\School;
use Illuminate\Http\Request;

class ExpenseCategoryController extends Controller
{
    use AuthorizesSchoolDirecteur;

    public function index(Request $request, School $school)
    {
        $this->authorizeFinanceStaff($request, $school);

        return response()->json(
            ExpenseCategory::query()
                ->where('school_id', $school->id)
                ->where('is_active', true)
                ->orderBy('name')
                ->get()
        );
    }

    public function store(Request $request, School $school)
    {
        $this->authorizeFinanceManager($request, $school);

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
        ]);

        $category = ExpenseCategory::query()->create([...$validated, 'school_id' => $school->id]);

        return response()->json($category, 201);
    }

    public function update(Request $request, School $school, ExpenseCategory $expenseCategory)
    {
        $this->authorizeFinanceManager($request, $school);
        abort_if($expenseCategory->school_id !== $school->id, 404);

        $validated = $request->validate([
            'name' => ['sometimes', 'string', 'max:255'],
            'is_active' => ['sometimes', 'boolean'],
        ]);

        $expenseCategory->update($validated);

        return response()->json($expenseCategory);
    }

    public function destroy(Request $request, School $school, ExpenseCategory $expenseCategory)
    {
        $this->authorizeFinanceManager($request, $school);
        abort_if($expenseCategory->school_id !== $school->id, 404);

        $expenseCategory->delete();

        return response()->json(status: 204);
    }
}
