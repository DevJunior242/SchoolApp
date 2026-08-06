<?php

namespace App\Services;

use App\Models\Attendance;
use App\Models\EnrollmentRequest;
use App\Models\Payment;
use App\Models\School;
use App\Models\SchoolClass;
use App\Models\SchoolStudent;
use App\Models\SchoolUser;
use Illuminate\Support\Collection;

/**
 * Chiffres clés de l'école, réutilisés par le tableau de bord du personnel
 * (DashboardController) et par l'assistant IA (même source de vérité, pas
 * de calcul dupliqué).
 */
class SchoolSummaryService
{
    public function summary(School $school): array
    {
        $studentsCount = SchoolStudent::query()
            ->where('school_id', $school->id)
            ->where('status', SchoolStudent::STATUS_ACTIVE)
            ->count();

        $teachersCount = SchoolUser::query()
            ->where('school_id', $school->id)
            ->whereHas('role', fn ($query) => $query->where('slug', 'professeur'))
            ->count();

        $classesCount = SchoolClass::query()
            ->where('school_id', $school->id)
            ->whereHas('schoolYear', fn ($query) => $query->where('is_current', true))
            ->count();

        $pendingPayments = Payment::query()
            ->where('school_id', $school->id)
            ->where('status', Payment::STATUS_PENDING);

        $confirmedAmount = Payment::query()
            ->where('school_id', $school->id)
            ->where('status', Payment::STATUS_CONFIRMED)
            ->sum('amount');

        $pendingJustifications = Attendance::query()
            ->where('justification_status', Attendance::JUSTIFICATION_EN_ATTENTE)
            ->whereHas('classSubjectTeacher.schoolClass', fn ($query) => $query->where('school_id', $school->id))
            ->count();

        $todayAbsent = Attendance::query()
            ->where('status', Attendance::STATUS_ABSENT)
            ->where('date', now()->toDateString())
            ->whereHas('classSubjectTeacher.schoolClass', fn ($query) => $query->where('school_id', $school->id))
            ->count();

        return [
            'students_count' => $studentsCount,
            'teachers_count' => $teachersCount,
            'classes_count' => $classesCount,
            'payments_pending_count' => (clone $pendingPayments)->count(),
            'payments_pending_amount' => (clone $pendingPayments)->sum('amount'),
            'payments_confirmed_amount' => $confirmedAmount,
            'attendance_pending_justifications' => $pendingJustifications,
            'attendance_today_absent' => $todayAbsent,
        ];
    }

    /**
     * Fil d'activité récente : uniquement des événements réellement tracés
     * en base (paiements confirmés, demandes d'inscription, absences
     * justifiées). Pas de "bulletin généré" ni de compteur de questions à
     * l'assistant IA ici — ces événements ne sont pas persistés côté
     * backend, les inventer afficherait une fausse activité au directeur.
     *
     * @return Collection<int, array<string, mixed>>
     */
    public function recentActivity(School $school, int $limit = 6): Collection
    {
        $payments = Payment::query()
            ->where('school_id', $school->id)
            ->where('status', Payment::STATUS_CONFIRMED)
            ->whereNotNull('confirmed_at')
            ->with(['student', 'paymentMethod'])
            ->latest('confirmed_at')
            ->limit($limit)
            ->get()
            ->map(fn (Payment $payment) => [
                'type' => 'payment',
                'label' => sprintf(
                    'Paiement %s reçu — %s',
                    $payment->paymentMethod?->name ?? 'confirmé',
                    $payment->student?->fullname ?? 'élève'
                ),
                'at' => $payment->confirmed_at,
            ]);

        $enrollments = EnrollmentRequest::query()
            ->where('school_id', $school->id)
            ->latest('created_at')
            ->limit($limit)
            ->get()
            ->map(fn (EnrollmentRequest $request) => [
                'type' => 'enrollment',
                'label' => "Nouvelle demande d'inscription — {$request->child_fullname}",
                'at' => $request->created_at,
            ]);

        $justifications = Attendance::query()
            ->where('justification_status', Attendance::JUSTIFICATION_JUSTIFIEE)
            ->whereNotNull('justified_at')
            ->whereHas('classSubjectTeacher.schoolClass', fn ($query) => $query->where('school_id', $school->id))
            ->with('student')
            ->latest('justified_at')
            ->limit($limit)
            ->get()
            ->map(fn (Attendance $attendance) => [
                'type' => 'justification',
                'label' => 'Absence justifiée — '.($attendance->student?->fullname ?? 'élève'),
                'at' => $attendance->justified_at,
            ]);

        return $payments
            ->concat($enrollments)
            ->concat($justifications)
            ->sortByDesc('at')
            ->take($limit)
            ->values();
    }
}
