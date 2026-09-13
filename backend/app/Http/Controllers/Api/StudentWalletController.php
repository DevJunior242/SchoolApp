<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Api\Concerns\AuthorizesSchoolDirecteur;
use App\Http\Controllers\Api\Concerns\ValidatesSchoolSection;
use App\Models\ClassStudent;
use App\Http\Controllers\Controller;
use App\Models\ParentStudent;
use App\Models\School;
use App\Models\SchoolUser;
use App\Models\Student;
use App\Models\StudentWallet;
use App\Models\WalletTransaction;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class StudentWalletController extends Controller
{
    use AuthorizesSchoolDirecteur, ValidatesSchoolSection;

    private const STAFF_ROLE_SLUGS = ['directeur', 'comptable', 'secretaire', 'cantine', 'fondateur'];

    /**
     * File d'attente du personnel autorisé (comptable/directeur/secrétariat
     * /cantine) : toutes les recharges de l'école, filtrables par statut
     * (ex: ?status=0 pour à confirmer).
     */
    public function index(Request $request, School $school)
    {
        $this->authorizeRoles($request, $school, self::STAFF_ROLE_SLUGS, 'Accès réservé au personnel administratif.');
        $sectionIds = $this->restrictedSectionIds($request, $school);

        return response()->json(
            WalletTransaction::query()
                ->whereHas('wallet', fn($query) => $query->where('school_id', $school->id))
                ->when($sectionIds, fn($query, $ids) => $query->whereHas(
                    'wallet.student.classStudents',
                    fn($classStudentQuery) => $classStudentQuery
                        ->where('status', ClassStudent::STATUS_ACTIVE)
                        ->whereHas('schoolClass', fn($classQuery) => $classQuery
                            ->where('school_id', $school->id)
                            ->whereHas('level', fn($levelQuery) => $levelQuery->whereIn('section_id', $ids)))
                ))
                ->where('type', WalletTransaction::TYPE_RECHARGE)
                ->when($request->query('status') !== null, fn($query) => $query->where('status', $request->query('status')))
                ->with(['wallet.student', 'paymentMethod', 'declaredBy'])
                ->latest('created_at')
                ->paginate($request->integer('per_page', 10))
        );
    }

    public function show(Request $request, School $school, Student $student)
    {
        $this->authorizeStaffParentOrSelf($request, $school, $student);
        $this->authorizeStudentSection($request, $school, $student);

        $wallet = StudentWallet::query()->firstOrCreate(
            ['school_id' => $school->id, 'student_id' => $student->id]
        );

        return response()->json([
            'wallet' => $wallet,
            'transactions' => $wallet->transactions()
                ->with(['paymentMethod', 'declaredBy', 'confirmedBy'])
                ->latest('created_at')
                ->get(),
        ]);
    }

    public function requestRecharge(Request $request, School $school, Student $student)
    {
        $this->authorizeStaffParentOrSelf($request, $school, $student);
        $this->authorizeStudentSection($request, $school, $student);

        $validated = $request->validate([
            'payment_method_id' => [
                'required',
                'uuid',
                Rule::exists('payment_methods', 'id')
                    ->where('school_id', $school->id)
                    ->where('is_active', true),
            ],
            'amount' => ['required', 'numeric', 'min:0.01'],
            'sender_number' => ['required', 'string', 'max:30'],
            'transaction_id' => ['nullable', 'string', 'max:100'],
        ]);

        $wallet = StudentWallet::query()->firstOrCreate(
            ['school_id' => $school->id, 'student_id' => $student->id]
        );

        // Un directeur/comptable/cantine qui encaisse en direct (à la
        // caisse, au guichet cantine) confirme sur le coup ; secrétariat et
        // parents restent en attente de validation. Le personnel de
        // cantine encaisse là où l'argent change réellement de main — pas
        // besoin de faire remonter chaque recharge au comptable.
        $canAutoConfirm = SchoolUser::query()
            ->where('school_id', $school->id)
            ->where('user_id', $request->user()->id)
            ->whereHas('role', fn($query) => $query->whereIn('slug', ['directeur', 'comptable', 'cantine']))
            ->exists();

        $transaction = $wallet->transactions()->create([
            'type' => WalletTransaction::TYPE_RECHARGE,
            'amount' => $validated['amount'],
            'status' => $canAutoConfirm ? WalletTransaction::STATUS_CONFIRMED : WalletTransaction::STATUS_PENDING,
            'payment_method_id' => $validated['payment_method_id'],
            'sender_number' => $validated['sender_number'],
            'transaction_id' => $validated['transaction_id'] ?? null,
            'declared_by' => $request->user()->id,
            'confirmed_by' => $canAutoConfirm ? $request->user()->id : null,
            'confirmed_at' => $canAutoConfirm ? now() : null,
        ]);

        if ($canAutoConfirm) {
            $this->creditWallet($wallet, $transaction);
        }

        return response()->json($transaction->load('paymentMethod'), 201);
    }

    public function confirmRecharge(Request $request, School $school, WalletTransaction $walletTransaction)
    {
        $this->authorizeRoles($request, $school, ['directeur', 'comptable', 'cantine'], 'Seuls le directeur, le comptable et le personnel de cantine peuvent confirmer une recharge.');
        $wallet = $walletTransaction->wallet;
        abort_if($wallet->school_id !== $school->id, 404);
        $this->authorizeStudentSection($request, $school, $wallet->student);
        abort_unless($walletTransaction->status === WalletTransaction::STATUS_PENDING, 422);

        $walletTransaction->update([
            'status' => WalletTransaction::STATUS_CONFIRMED,
            'confirmed_by' => $request->user()->id,
            'confirmed_at' => now(),
        ]);

        $this->creditWallet($wallet, $walletTransaction);

        return response()->json($walletTransaction->load('wallet', 'paymentMethod'));
    }

    public function rejectRecharge(Request $request, School $school, WalletTransaction $walletTransaction)
    {
        $this->authorizeRoles($request, $school, ['directeur', 'comptable', 'cantine'], 'Seuls le directeur, le comptable et le personnel de cantine peuvent rejeter une recharge.');
        abort_if($walletTransaction->wallet->school_id !== $school->id, 404);
        $this->authorizeStudentSection($request, $school, $walletTransaction->wallet->student);
        abort_unless($walletTransaction->status === WalletTransaction::STATUS_PENDING, 422);

        $walletTransaction->update([
            'status' => WalletTransaction::STATUS_REJECTED,
            'confirmed_by' => $request->user()->id,
            'confirmed_at' => now(),
        ]);

        return response()->json($walletTransaction->load('wallet', 'paymentMethod'));
    }

    /**
     * Crédite le solde et réarme l'alerte solde bas (une prochaine baisse
     * pourra notifier à nouveau).
     */
    private function creditWallet(StudentWallet $wallet, WalletTransaction $transaction): void
    {
        $wallet->increment('balance', $transaction->amount);
        $wallet->update(['low_balance_notified' => false]);
    }

    /**
     * Un élève majeur avec son propre compte peut consulter et recharger
     * son propre portefeuille, comme un parent le fait pour ses enfants
     * (même schéma que BookReservationController::abortUnlessSelfParentOrStaff).
     */
    private function authorizeStaffParentOrSelf(Request $request, School $school, Student $student): void
    {
        $userId = $request->user()->id;

        if ($student->user_id === $userId) {
            return;
        }

        $isStaff = SchoolUser::query()
            ->where('school_id', $school->id)
            ->where('user_id', $userId)
            ->whereHas('role', fn($query) => $query->whereIn('slug', self::STAFF_ROLE_SLUGS))
            ->exists();

        if ($isStaff) {
            return;
        }

        $isParent = ParentStudent::query()
            ->where('student_id', $student->id)
            ->where('parent_user_id', $userId)
            ->exists();

        abort_unless($isParent, 403, "Vous n'êtes pas autorisé à consulter le portefeuille de cet élève.");
    }

    private function authorizeStudentSection(Request $request, School $school, Student $student): void
    {
        $classStudent = ClassStudent::query()
            ->where('student_id', $student->id)
            ->where('status', ClassStudent::STATUS_ACTIVE)
            ->whereHas('schoolClass', fn($query) => $query->where('school_id', $school->id))
            ->with('schoolClass')
            ->latest('created_at')
            ->firstOrFail();

        $this->authorizeLevelSection($request, $school, $this->activeSchoolClass($school, $classStudent->schoolClass));
    }
}
