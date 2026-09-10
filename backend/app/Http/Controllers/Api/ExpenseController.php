<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Api\Concerns\AuthorizesSchoolDirecteur;
use App\Http\Controllers\Api\Concerns\ValidatesSchoolSection;
use App\Http\Controllers\Controller;
use App\Models\Expense;
use App\Models\School;
use App\Models\SchoolUser;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;

class ExpenseController extends Controller
{
    use AuthorizesSchoolDirecteur, ValidatesSchoolSection;

    public function index(Request $request, School $school)
    {
        $this->authorizeFinanceStaff($request, $school);
        $sectionIds = $this->restrictedSectionIds($request, $school);

        return response()->json(
            Expense::query()
                ->where('school_id', $school->id)
                ->when($request->query('status') !== null, fn ($query) => $query->where('status', $request->query('status')))
                // Les dépenses communes (section_id null) sont réservées à
                // la direction/comptabilité globale, jamais à une section.
                ->when($sectionIds, fn ($query, $ids) => $query->whereIn('section_id', $ids))
                ->with(['section', 'expenseCategory', 'treasuryAccount', 'paymentMethod', 'declaredBy'])
                ->latest('expense_date')
                ->paginate($request->integer('per_page', 10))
        );
    }

    public function store(Request $request, School $school)
    {
        $this->authorizeFinanceStaff($request, $school);
        $sectionIds = $this->restrictedSectionIds($request, $school);

        $validated = $request->validate([
            'expense_category_id' => [
                'required',
                'uuid',
                Rule::exists('expense_categories', 'id')->where('school_id', $school->id),
            ],
            'treasury_account_id' => [
                'nullable',
                'uuid',
                Rule::exists('treasury_accounts', 'id')->where('school_id', $school->id),
            ],
            'payment_method_id' => [
                'nullable',
                'uuid',
                Rule::exists('payment_methods', 'id')->where('school_id', $school->id),
            ],
            'section_id' => ['nullable', 'uuid', 'exists:sections,id'],
            'amount' => ['required', 'numeric', 'min:0.01'],
            'supplier_name' => ['nullable', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'expense_date' => ['required', 'date'],
            'receipt' => ['nullable', 'file', 'mimes:pdf,jpg,jpeg,png', 'max:8192'],
        ]);

        if ($sectionIds && empty($validated['section_id'])) {
            throw \Illuminate\Validation\ValidationException::withMessages([
                'section_id' => ['Sélectionnez une section pour cette dépense.'],
            ]);
        }

        if (! empty($validated['section_id'])) {
            $sectionIsActive = $school->sections()
                ->whereKey($validated['section_id'])
                ->wherePivot('active', true)
                ->exists();
            abort_unless($sectionIsActive, 422, "Cette section n'est pas active dans cette école.");
            abort_unless(! $sectionIds || in_array($validated['section_id'], $sectionIds, true), 403);
        }

        // Même logique que les paiements : directeur/comptable qui saisit
        // en direct confirme sur le coup, le secrétariat reste en attente.
        $canAutoConfirm = SchoolUser::query()
            ->where('school_id', $school->id)
            ->where('user_id', $request->user()->id)
            ->whereHas('role', fn ($query) => $query->whereIn('slug', ['directeur', 'comptable']))
            ->exists();

        $expense = Expense::query()->create([
            ...collect($validated)->except('receipt')->all(),
            'school_id' => $school->id,
            'receipt_path' => $request->hasFile('receipt')
                ? $request->file('receipt')->store("schools/{$school->id}/expenses", 'finance')
                : null,
            'status' => $canAutoConfirm ? Expense::STATUS_CONFIRMED : Expense::STATUS_PENDING,
            'declared_by' => $request->user()->id,
            'confirmed_by' => $canAutoConfirm ? $request->user()->id : null,
            'confirmed_at' => $canAutoConfirm ? now() : null,
        ]);

        return response()->json($expense->load('section', 'expenseCategory', 'treasuryAccount', 'paymentMethod'), 201);
    }

    public function confirm(Request $request, School $school, Expense $expense)
    {
        $this->authorizeFinanceManager($request, $school);
        abort_if($expense->school_id !== $school->id, 404);
        $this->authorizeExpenseSection($request, $school, $expense);

        $expense->update([
            'status' => Expense::STATUS_CONFIRMED,
            'confirmed_by' => $request->user()->id,
            'confirmed_at' => now(),
        ]);

        return response()->json($expense->load('section', 'expenseCategory', 'treasuryAccount', 'paymentMethod'));
    }

    public function reject(Request $request, School $school, Expense $expense)
    {
        $this->authorizeFinanceManager($request, $school);
        abort_if($expense->school_id !== $school->id, 404);
        $this->authorizeExpenseSection($request, $school, $expense);

        $expense->update([
            'status' => Expense::STATUS_REJECTED,
            'confirmed_by' => $request->user()->id,
            'confirmed_at' => now(),
        ]);

        return response()->json($expense->load('section', 'expenseCategory', 'treasuryAccount', 'paymentMethod'));
    }

    public function downloadReceipt(Request $request, School $school, Expense $expense)
    {
        $this->authorizeFinanceStaff($request, $school);
        abort_if($expense->school_id !== $school->id, 404);
        $this->authorizeExpenseSection($request, $school, $expense);
        abort_if($expense->receipt_path === null, 404, 'Aucun justificatif pour cette dépense.');

        return Storage::disk('finance')->response($expense->receipt_path);
    }

    private function authorizeExpenseSection(Request $request, School $school, Expense $expense): void
    {
        $sectionIds = $this->restrictedSectionIds($request, $school);
        if (! $sectionIds) {
            return;
        }

        abort_unless($expense->section_id && in_array($expense->section_id, $sectionIds, true), 403);
    }
}
