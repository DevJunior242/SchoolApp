<?php

namespace App\Services;

use App\Models\Expense;
use App\Models\Payment;
use App\Models\TreasuryAccount;
use App\Models\TreasuryMovement;

/**
 * Calcule le solde d'un compte de trésorerie (caisse ou banque) à la volée,
 * plutôt que de maintenir un solde stocké. Un compte est crédité par les
 * paiements confirmés dont le moyen de paiement lui est rattaché, débité par
 * les dépenses confirmées imputées dessus, et ajusté par les mouvements
 * manuels (virement, dépôt, retrait, subvention reçue directement...).
 */
class TreasuryService
{
    public function balance(TreasuryAccount $account): float
    {
        $received = Payment::query()
            ->where('status', Payment::STATUS_CONFIRMED)
            ->whereHas('paymentMethod', fn ($query) => $query->where('treasury_account_id', $account->id))
            ->sum('amount');

        $spent = Expense::query()
            ->where('treasury_account_id', $account->id)
            ->where('status', Expense::STATUS_CONFIRMED)
            ->sum('amount');

        $credits = TreasuryMovement::query()
            ->where('treasury_account_id', $account->id)
            ->whereIn('type', TreasuryMovement::CREDIT_TYPES)
            ->sum('amount');

        $debits = TreasuryMovement::query()
            ->where('treasury_account_id', $account->id)
            ->whereNotIn('type', TreasuryMovement::CREDIT_TYPES)
            ->sum('amount');

        return round(
            (float) $account->opening_balance + $received - $spent + $credits - $debits,
            2
        );
    }
}
