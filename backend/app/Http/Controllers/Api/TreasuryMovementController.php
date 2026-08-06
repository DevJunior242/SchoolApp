<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Api\Concerns\AuthorizesSchoolDirecteur;
use App\Http\Controllers\Controller;
use App\Models\School;
use App\Models\TreasuryAccount;
use App\Models\TreasuryMovement;
use Illuminate\Http\Request;

class TreasuryMovementController extends Controller
{
    use AuthorizesSchoolDirecteur;

    private const TYPES = [
        TreasuryMovement::TYPE_DEPOSIT,
        TreasuryMovement::TYPE_WITHDRAWAL,
        TreasuryMovement::TYPE_TRANSFER_IN,
        TreasuryMovement::TYPE_TRANSFER_OUT,
        TreasuryMovement::TYPE_ADJUSTMENT,
    ];

    public function index(Request $request, School $school, TreasuryAccount $treasuryAccount)
    {
        $this->authorizeFinanceStaff($request, $school);
        abort_if($treasuryAccount->school_id !== $school->id, 404);

        return response()->json(
            TreasuryMovement::query()
                ->where('treasury_account_id', $treasuryAccount->id)
                ->with('createdBy')
                ->latest('created_at')
                ->paginate($request->integer('per_page', 15))
        );
    }

    // Réservé au directeur/comptable : contrairement aux paiements et
    // dépenses, un mouvement manuel n'a pas d'origine tierce à valider a
    // posteriori (aucun élève ni fournisseur ne l'a "déclaré") — il est
    // donc effectif dès sa saisie, par des rôles déjà habilités à confirmer.
    public function store(Request $request, School $school, TreasuryAccount $treasuryAccount)
    {
        $this->authorizeFinanceManager($request, $school);
        abort_if($treasuryAccount->school_id !== $school->id, 404);

        $validated = $request->validate([
            'type' => ['required', 'in:'.implode(',', self::TYPES)],
            'amount' => ['required', 'numeric', 'min:0.01'],
            'note' => ['nullable', 'string'],
        ]);

        $movement = TreasuryMovement::query()->create([
            ...$validated,
            'school_id' => $school->id,
            'treasury_account_id' => $treasuryAccount->id,
            'created_by' => $request->user()->id,
        ]);

        return response()->json($movement->load('createdBy'), 201);
    }
}
