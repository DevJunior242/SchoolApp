<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Api\Concerns\AuthorizesSchoolDirecteur;
use App\Http\Controllers\Controller;
use App\Models\CafeteriaMealService;
use App\Models\CafeteriaMenu;
use App\Models\CafeteriaMenuItem;
use App\Models\ClassStudent;
use App\Models\FeeStructure;
use App\Models\ParentStudent;
use App\Models\Payment;
use App\Models\School;
use App\Models\Season;
use App\Models\Student;
use App\Models\StudentWallet;
use App\Models\User;
use App\Models\WalletTransaction;
use App\Notifications\WalletLowBalanceNotification;
use Illuminate\Http\Request;

class CafeteriaMealServiceController extends Controller
{
    use AuthorizesSchoolDirecteur;

    private const STAFF_ROLE_SLUGS = ['directeur', 'comptable', 'secretaire', 'cantine'];

    /**
     * Étape 1 du service, après scan du QR badge (qui résout {student} via
     * son id) : affiche photo/nom + solde + statut abonnement + menu du
     * jour, pour confirmation visuelle avant de servir.
     */
    public function lookup(Request $request, School $school, Student $student)
    {
        $this->authorizeRoles($request, $school, self::STAFF_ROLE_SLUGS, "Vous n'avez pas accès au service de cantine.");
        $this->abortUnlessEnrolled($school, $student);

        $menu = CafeteriaMenu::query()
            ->where('school_id', $school->id)
            ->whereDate('date', now()->toDateString())
            ->with('items')
            ->first();

        $wallet = StudentWallet::query()->firstOrCreate(
            ['school_id' => $school->id, 'student_id' => $student->id]
        );

        $alreadyServed = $menu
            ? CafeteriaMealService::query()->where('student_id', $student->id)->where('cafeteria_menu_id', $menu->id)->exists()
            : false;

        return response()->json([
            'student' => $student,
            'wallet_balance' => $wallet->balance,
            'has_active_subscription' => $this->activeSubscriptionFeeStructure($school, $student) !== null,
            'menu' => $menu,
            'already_served' => $alreadyServed,
        ]);
    }

    /**
     * Étape 2 : sert effectivement l'élève. Couvert par l'abonnement s'il
     * en a un actif pour la saison en cours, sinon débité du portefeuille.
     * `force: true` sert quand même en cas de solde insuffisant (le solde
     * passe négatif) plutôt que de laisser un enfant sans repas.
     */
    public function store(Request $request, School $school, Student $student)
    {
        $this->authorizeRoles($request, $school, self::STAFF_ROLE_SLUGS, "Vous n'avez pas accès au service de cantine.");
        $this->abortUnlessEnrolled($school, $student);

        $validated = $request->validate([
            'cafeteria_menu_item_id' => ['required', 'uuid', 'exists:cafeteria_menu_items,id'],
            'force' => ['nullable', 'boolean'],
        ]);

        $menuItem = CafeteriaMenuItem::query()->with('menu')->findOrFail($validated['cafeteria_menu_item_id']);
        abort_if($menuItem->menu->school_id !== $school->id, 404);
        abort_unless($menuItem->menu->date->isToday(), 422, "Ce menu n'est plus celui du jour.");

        $alreadyServed = CafeteriaMealService::query()
            ->where('student_id', $student->id)
            ->where('cafeteria_menu_id', $menuItem->cafeteria_menu_id)
            ->exists();
        abort_if($alreadyServed, 422, 'Cet élève a déjà été servi aujourd\'hui.');

        $subscription = $this->activeSubscriptionFeeStructure($school, $student);

        if ($subscription) {
            $mealService = CafeteriaMealService::query()->create([
                'school_id' => $school->id,
                'student_id' => $student->id,
                'cafeteria_menu_id' => $menuItem->cafeteria_menu_id,
                'cafeteria_menu_item_id' => $menuItem->id,
                'served_at' => now(),
                'served_by' => $request->user()->id,
                'covered_by' => CafeteriaMealService::COVERED_BY_SUBSCRIPTION,
                'fee_structure_id' => $subscription->id,
            ]);

            return response()->json($mealService->load('menuItem', 'student'), 201);
        }

        $wallet = StudentWallet::query()->firstOrCreate(
            ['school_id' => $school->id, 'student_id' => $student->id]
        );

        $insufficientFunds = $wallet->balance < $menuItem->price;
        if ($insufficientFunds && ! ($validated['force'] ?? false)) {
            return response()->json([
                'message' => 'Solde insuffisant.',
                'wallet_balance' => $wallet->balance,
                'price' => $menuItem->price,
            ], 422);
        }

        $transaction = $wallet->transactions()->create([
            'type' => WalletTransaction::TYPE_DEBIT,
            'amount' => $menuItem->price,
            'status' => WalletTransaction::STATUS_CONFIRMED,
            'confirmed_by' => $request->user()->id,
            'confirmed_at' => now(),
            'notes' => "Repas — {$menuItem->label}",
        ]);

        $wallet->decrement('balance', $menuItem->price);

        $mealService = CafeteriaMealService::query()->create([
            'school_id' => $school->id,
            'student_id' => $student->id,
            'cafeteria_menu_id' => $menuItem->cafeteria_menu_id,
            'cafeteria_menu_item_id' => $menuItem->id,
            'served_at' => now(),
            'served_by' => $request->user()->id,
            'covered_by' => CafeteriaMealService::COVERED_BY_WALLET,
            'wallet_transaction_id' => $transaction->id,
        ]);

        $this->notifyIfLowBalance($wallet->fresh(), $school);

        return response()->json($mealService->load('menuItem', 'student'), 201);
    }

    /**
     * L'id d'un élève est réutilisé tel quel dans le QR (voir Student::$matricule) :
     * un id réel mais d'un élève d'une AUTRE école ne doit pas pouvoir être
     * scanné/servi ici, sinon on lui crée un portefeuille et un historique
     * dans une école où il n'est pas inscrit.
     */
    private function abortUnlessEnrolled(School $school, Student $student): void
    {
        $enrolled = ClassStudent::query()
            ->where('student_id', $student->id)
            ->where('status', ClassStudent::STATUS_ACTIVE)
            ->whereHas('schoolClass', fn ($query) => $query->where('school_id', $school->id))
            ->exists();

        abort_unless($enrolled, 404);
    }

    private function activeSubscriptionFeeStructure(School $school, Student $student): ?FeeStructure
    {
        $season = $this->currentSeason($school);
        if (! $season) {
            return null;
        }

        $subscriptionIds = FeeStructure::query()
            ->where('school_id', $school->id)
            ->where('category', FeeStructure::CATEGORY_CAFETERIA_SUBSCRIPTION)
            ->where('season_id', $season->id)
            ->pluck('id');

        $paidFeeStructureId = Payment::query()
            ->where('student_id', $student->id)
            ->whereIn('fee_structure_id', $subscriptionIds)
            ->where('status', Payment::STATUS_CONFIRMED)
            ->value('fee_structure_id');

        return $paidFeeStructureId ? FeeStructure::find($paidFeeStructureId) : null;
    }

    private function currentSeason(School $school): ?Season
    {
        $today = now()->toDateString();

        return Season::query()
            ->where('school_id', $school->id)
            ->whereHas('schoolYear', fn ($query) => $query->where('is_current', true))
            ->where('start_date', '<=', $today)
            ->where('end_date', '>=', $today)
            ->first();
    }

    private function notifyIfLowBalance(StudentWallet $wallet, School $school): void
    {
        if ($wallet->low_balance_notified || $wallet->balance >= $school->cafeteria_low_balance_threshold) {
            return;
        }

        $wallet->update(['low_balance_notified' => true]);

        $parentIds = ParentStudent::query()->where('student_id', $wallet->student_id)->pluck('parent_user_id');
        $recipients = User::query()->whereIn('id', $parentIds)->get();

        foreach ($recipients as $recipient) {
            $recipient->notify(new WalletLowBalanceNotification($wallet));
        }
    }
}
