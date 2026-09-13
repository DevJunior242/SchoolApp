<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Api\Concerns\AuthorizesSchoolDirecteur;
use App\Http\Controllers\Controller;
use App\Models\School;
use App\Models\TreasuryAccount;
use App\Services\TreasuryService;
use Exception;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Throwable;

class TreasuryAccountController extends Controller
{
    use AuthorizesSchoolDirecteur;

    public function index(Request $request, School $school, TreasuryService $treasuryService)
    {
        $this->authorizeFinanceStaff($request, $school);

        $accounts = TreasuryAccount::query()
            ->where('school_id', $school->id)
            ->where('is_active', true)
            ->when($request->filled('section_id'), fn($query) => $query->where('section_id', $request->query('section_id')))
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

        // 1. Validation : vérifier l'existence dans la table pivot school_sections
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'type' => ['required', 'in:' . implode(',', [TreasuryAccount::TYPE_CASH, TreasuryAccount::TYPE_BANK])],
            'bank_name' => ['nullable', 'string', 'max:255'],
            'opening_balance' => ['nullable', 'numeric'],
            'section_id' => [
                'nullable',
                'uuid',
                Rule::exists('school_sections', 'section_id')->where('school_id', $school->id)

            ],
        ]);

        try {
            $account = TreasuryAccount::query()->create([
                ...$validated,
                'school_id' => $school->id,
            ]);

            return response()->json($account->load('section'), 201);
        } catch (Throwable $e) {
            Log::error('Treasury account creation error', ['error' => $e->getMessage()]);
            return response()->json(['message' => 'Erreur lors de la création du compte.'], 500);
        }
    }

    public function update(Request $request, School $school, TreasuryAccount $treasuryAccount)
    {


        try {
            Log::info('Treasury update request', [
                'account_id' => $treasuryAccount->id,
                'school_id' => $school->id,
                'payload' => $request->all()
            ]);

            $this->authorizeFinanceManager($request, $school);
            abort_if($treasuryAccount->school_id !== $school->id, 404);

            $validated = $request->validate([
                'name' => ['sometimes', 'string', 'max:255'],
                'type' => ['sometimes', 'in:' . implode(',', [TreasuryAccount::TYPE_CASH, TreasuryAccount::TYPE_BANK])],
                'bank_name' => ['nullable', 'string', 'max:255'],
                'opening_balance' => ['sometimes', 'numeric'],
                'is_active' => ['sometimes', 'boolean'],
                'section_id' => [
                    'nullable',
                    Rule::exists('school_sections', 'section_id')
                        ->where('school_id', $school->id)
                        ->where('active', true) // Bonus: filter les sections inactives
                ],
            ]);

            $treasuryAccount->update($validated);

            return response()->json($treasuryAccount->load('section'));
        } catch (Exception $e) {
            Log::error('Treasury update error', [
                'message' => $e->getMessage(),
                'line' => $e->getLine(),
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json(['message' => $e->getMessage()], 500);
        }
    }

    public function destroy(Request $request, School $school, TreasuryAccount $treasuryAccount)
    {
        $this->authorizeFinanceManager($request, $school);
        abort_if($treasuryAccount->school_id !== $school->id, 404);

        $treasuryAccount->delete();

        return response()->json(status: 204);
    }
}
