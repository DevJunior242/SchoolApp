<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Api\Concerns\AuthorizesSchoolDirecteur;
use App\Http\Controllers\Controller;
use App\Models\ClassStudent;
use App\Models\FeeStructure;
use App\Models\ParentStudent;
use App\Models\Payment;
use App\Models\School;
use App\Models\SchoolUser;
use App\Models\Student;
use Illuminate\Http\Request;

class PaymentController extends Controller
{
    use AuthorizesSchoolDirecteur;

    private const STAFF_ROLE_SLUGS = ['directeur', 'comptable', 'secretaire'];

    /**
     * Vue globale du comptable/directeur : tous les paiements de l'école,
     * filtrables par statut (ex: ?status=0 pour la file d'attente à confirmer).
     */
    public function index(Request $request, School $school)
    {
        $this->authorizeRoles($request, $school, self::STAFF_ROLE_SLUGS, "Accès réservé au personnel administratif.");

        return response()->json(
            Payment::query()
                ->where('school_id', $school->id)
                ->when($request->query('status') !== null, fn ($query) => $query->where('status', $request->query('status')))
                ->with(['student', 'feeStructure', 'paymentMethod', 'declaredBy'])
                ->latest('created_at')
                ->paginate($request->integer('per_page', 10))
        );
    }

    /**
     * Historique + solde d'un élève précis (accessible au staff ou à son
     * propre parent).
     */
    public function forStudent(Request $request, School $school, Student $student)
    {
        $this->authorizeStaffOrParent($request, $school, $student);

        $classStudent = ClassStudent::query()
            ->where('student_id', $student->id)
            ->where('status', ClassStudent::STATUS_ACTIVE)
            ->whereHas('schoolClass', fn ($query) => $query->where('school_id', $school->id))
            ->latest('created_at')
            ->with('schoolClass')
            ->first();

        $feeStructures = $classStudent
            ? FeeStructure::query()
                ->where('school_id', $school->id)
                ->where('level_id', $classStudent->schoolClass->level_id)
                ->where('school_year_id', $classStudent->schoolClass->school_year_id)
                ->orderBy('order')
                ->get()
            : collect();

        $payments = Payment::query()
            ->where('school_id', $school->id)
            ->where('student_id', $student->id)
            ->with(['feeStructure', 'paymentMethod', 'declaredBy'])
            ->latest('created_at')
            ->get();

        $totalDue = $feeStructures->sum('amount');
        $totalConfirmed = $payments->where('status', Payment::STATUS_CONFIRMED)->sum('amount');

        return response()->json([
            'fee_structures' => $feeStructures,
            'payments' => $payments,
            'total_due' => $totalDue,
            'total_confirmed' => $totalConfirmed,
            'balance' => $totalDue - $totalConfirmed,
        ]);
    }

    public function store(Request $request, School $school, Student $student)
    {
        $this->authorizeStaffOrParent($request, $school, $student);

        $validated = $request->validate([
            'fee_structure_id' => ['required', 'uuid', 'exists:fee_structures,id'],
            'payment_method_id' => ['required', 'uuid', 'exists:payment_methods,id'],
            'amount' => ['required', 'numeric', 'min:0.01'],
            'sender_number' => ['required', 'string', 'max:30'],
            'transaction_id' => ['nullable', 'string', 'max:100'],
        ]);

        // Un directeur/comptable qui encaisse en direct (espèces au bureau,
        // vérification immédiate) confirme sur le coup. Le secrétariat et
        // les parents restent en attente de validation par le comptable.
        $canAutoConfirm = SchoolUser::query()
            ->where('school_id', $school->id)
            ->where('user_id', $request->user()->id)
            ->whereHas('role', fn ($query) => $query->whereIn('slug', ['directeur', 'comptable']))
            ->exists();

        $payment = Payment::query()->create([
            ...$validated,
            'school_id' => $school->id,
            'student_id' => $student->id,
            'status' => $canAutoConfirm ? Payment::STATUS_CONFIRMED : Payment::STATUS_PENDING,
            'declared_by' => $request->user()->id,
            'confirmed_by' => $canAutoConfirm ? $request->user()->id : null,
            'confirmed_at' => $canAutoConfirm ? now() : null,
        ]);

        return response()->json($payment->load('feeStructure', 'paymentMethod'), 201);
    }

    public function confirm(Request $request, School $school, Payment $payment)
    {
        $this->authorizeRoles($request, $school, ['directeur', 'comptable'], "Seuls le directeur et le comptable peuvent confirmer un paiement.");
        abort_if($payment->school_id !== $school->id, 404);

        $payment->update([
            'status' => Payment::STATUS_CONFIRMED,
            'confirmed_by' => $request->user()->id,
            'confirmed_at' => now(),
        ]);

        return response()->json($payment->load('student', 'feeStructure', 'paymentMethod'));
    }

    public function reject(Request $request, School $school, Payment $payment)
    {
        $this->authorizeRoles($request, $school, ['directeur', 'comptable'], "Seuls le directeur et le comptable peuvent rejeter un paiement.");
        abort_if($payment->school_id !== $school->id, 404);

        $payment->update([
            'status' => Payment::STATUS_REJECTED,
            'confirmed_by' => $request->user()->id,
            'confirmed_at' => now(),
        ]);

        return response()->json($payment->load('student', 'feeStructure', 'paymentMethod'));
    }

    private function authorizeStaffOrParent(Request $request, School $school, Student $student): void
    {
        $userId = $request->user()->id;

        $isStaff = SchoolUser::query()
            ->where('school_id', $school->id)
            ->where('user_id', $userId)
            ->whereHas('role', fn ($query) => $query->whereIn('slug', self::STAFF_ROLE_SLUGS))
            ->exists();

        if ($isStaff) {
            return;
        }

        $isParent = ParentStudent::query()
            ->where('student_id', $student->id)
            ->where('parent_user_id', $userId)
            ->exists();

        abort_unless($isParent, 403, "Vous n'êtes pas autorisé à consulter les paiements de cet élève.");
    }
}
