<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Api\Concerns\AuthorizesSchoolDirecteur;
use App\Http\Controllers\Controller;
use App\Models\Expense;
use App\Models\School;
use App\Models\SchoolUser;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class ExpenseController extends Controller
{
    use AuthorizesSchoolDirecteur;

    public function index(Request $request, School $school)
    {
        $this->authorizeFinanceStaff($request, $school);

        return response()->json(
            Expense::query()
                ->where('school_id', $school->id)
                ->when($request->query('status') !== null, fn ($query) => $query->where('status', $request->query('status')))
                ->with(['expenseCategory', 'treasuryAccount', 'paymentMethod', 'declaredBy'])
                ->latest('expense_date')
                ->paginate($request->integer('per_page', 10))
        );
    }

    public function store(Request $request, School $school)
    {
        $this->authorizeFinanceStaff($request, $school);

        $validated = $request->validate([
            'expense_category_id' => ['required', 'uuid', 'exists:expense_categories,id'],
            'treasury_account_id' => ['nullable', 'uuid', 'exists:treasury_accounts,id'],
            'payment_method_id' => ['nullable', 'uuid', 'exists:payment_methods,id'],
            'amount' => ['required', 'numeric', 'min:0.01'],
            'supplier_name' => ['nullable', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'expense_date' => ['required', 'date'],
            'receipt' => ['nullable', 'file', 'mimes:pdf,jpg,jpeg,png', 'max:8192'],
        ]);

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

        return response()->json($expense->load('expenseCategory', 'treasuryAccount', 'paymentMethod'), 201);
    }

    public function confirm(Request $request, School $school, Expense $expense)
    {
        $this->authorizeFinanceManager($request, $school);
        abort_if($expense->school_id !== $school->id, 404);

        $expense->update([
            'status' => Expense::STATUS_CONFIRMED,
            'confirmed_by' => $request->user()->id,
            'confirmed_at' => now(),
        ]);

        return response()->json($expense->load('expenseCategory', 'treasuryAccount', 'paymentMethod'));
    }

    public function reject(Request $request, School $school, Expense $expense)
    {
        $this->authorizeFinanceManager($request, $school);
        abort_if($expense->school_id !== $school->id, 404);

        $expense->update([
            'status' => Expense::STATUS_REJECTED,
            'confirmed_by' => $request->user()->id,
            'confirmed_at' => now(),
        ]);

        return response()->json($expense->load('expenseCategory', 'treasuryAccount', 'paymentMethod'));
    }

    public function downloadReceipt(Request $request, School $school, Expense $expense)
    {
        $this->authorizeFinanceStaff($request, $school);
        abort_if($expense->school_id !== $school->id, 404);
        abort_if($expense->receipt_path === null, 404, 'Aucun justificatif pour cette dépense.');

        return Storage::disk('finance')->response($expense->receipt_path);
    }
}
