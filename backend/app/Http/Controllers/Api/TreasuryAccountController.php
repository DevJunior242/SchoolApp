<?php

namespace App\Http\Controllers\Api;

use App\Models\School;
use Illuminate\Http\Request;
use App\Models\TreasuryAccount;
use Illuminate\Validation\Rule;
use App\Services\TreasuryService;
use App\Http\Controllers\Controller;
use App\Http\Controllers\Api\Concerns\AuthorizesSchoolDirecteur;

class TreasuryAccountController extends Controller
{
    use AuthorizesSchoolDirecteur;

    public function index(Request $request, School $school, TreasuryService $treasuryService)
    {
        $this->authorizeFinanceStaff($request, $school);

        $accounts = TreasuryAccount::query()
            ->where('school_id', $school->id)
            ->where('is_active', true)
            ->when($request->filled('section_id'), fn ($query) => $query->where('section_id', $request->query('section_id')))
            ->with('section')
            ->orderBy('name')
            ->get();

        $accounts->each(function (TreasuryAccount $account) use ($treasuryService) {
            $account->balance = $treasuryService->balance($account);
        });

        return response()->json($accounts);
    }

    public function store(Request $request, School $school)
    {
        $this->authorizeFinanceManager($request, $school);

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'type' => ['required', 'in:'.implode(',', [TreasuryAccount::TYPE_CASH, TreasuryAccount::TYPE_BANK])],
            'bank_name' => ['nullable', 'string', 'max:255'],
            'opening_balance' => ['nullable', 'numeric'],
            'section_id' => ['nullable', Rule::exists('sections', 'id')->where('school_id', $school->id)],
        ]);

        $account = TreasuryAccount::query()->create([...$validated, 'school_id' => $school->id]);

        return response()->json($account->load('section'), 201);
    }

    public function update(Request $request, School $school, TreasuryAccount $treasuryAccount)
    {
        $this->authorizeFinanceManager($request, $school);
        abort_if($treasuryAccount->school_id !== $school->id, 404);

        $validated = $request->validate([
            'name' => ['sometimes', 'string', 'max:255'],
            'type' => ['sometimes', 'in:'.implode(',', [TreasuryAccount::TYPE_CASH, TreasuryAccount::TYPE_BANK])],
            'bank_name' => ['nullable', 'string', 'max:255'],
            'opening_balance' => ['sometimes', 'numeric'],
            'is_active' => ['sometimes', 'boolean'],
            'section_id' => ['nullable', Rule::exists('sections', 'id')->where('school_id', $school->id)],
        ]);

        $treasuryAccount->update($validated);

        return response()->json($treasuryAccount->load('section'));
    }

    public function destroy(Request $request, School $school, TreasuryAccount $treasuryAccount)
    {
        $this->authorizeFinanceManager($request, $school);
        abort_if($treasuryAccount->school_id !== $school->id, 404);

        $treasuryAccount->delete();

        return response()->json(status: 204);
    }
}