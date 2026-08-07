<?php

namespace App\Services;

use App\Models\Attendance;
use App\Models\EnrollmentRequest;
use App\Models\Expense;
use App\Models\Payment;
use App\Models\School;
use App\Models\SchoolClass;
use App\Models\SchoolStudent;
use App\Models\SchoolUser;
use Carbon\Carbon;
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

        $pendingAmount = (clone $pendingPayments)->sum('amount');

        $pendingExpenses = Expense::query()
            ->where('school_id', $school->id)
            ->where('status', Expense::STATUS_PENDING);

        $confirmedExpensesAmount = Expense::query()
            ->where('school_id', $school->id)
            ->where('status', Expense::STATUS_CONFIRMED)
            ->sum('amount');

        $thisMonthAttendanceRate = $this->attendanceRateFor($school, now());
        $lastMonthAttendanceRate = $this->attendanceRateFor($school, now()->subMonthNoOverflow());

        $paymentsTodayAmount = Payment::query()
            ->where('school_id', $school->id)
            ->where('status', Payment::STATUS_CONFIRMED)
            ->whereDate('confirmed_at', now()->toDateString())
            ->sum('amount');

        $expensesTodayAmount = Expense::query()
            ->where('school_id', $school->id)
            ->where('status', Expense::STATUS_CONFIRMED)
            ->whereDate('confirmed_at', now()->toDateString())
            ->sum('amount');

        $paymentsMonthAmount = Payment::query()
            ->where('school_id', $school->id)
            ->where('status', Payment::STATUS_CONFIRMED)
            ->whereBetween('confirmed_at', [now()->startOfMonth(), now()->endOfMonth()])
            ->sum('amount');

        $expensesMonthAmount = Expense::query()
            ->where('school_id', $school->id)
            ->where('status', Expense::STATUS_CONFIRMED)
            ->whereBetween('confirmed_at', [now()->startOfMonth(), now()->endOfMonth()])
            ->sum('amount');

        return [
            'students_count' => $studentsCount,
            'students_growth_pct' => $this->studentsGrowthPct($school, $studentsCount),
            'teachers_count' => $teachersCount,
            'classes_count' => $classesCount,
            'payments_pending_count' => (clone $pendingPayments)->count(),
            'payments_pending_amount' => $pendingAmount,
            'payments_confirmed_amount' => $confirmedAmount,
            // % du montant déclaré (confirmé + en attente) qui est déjà
            // confirmé — null si rien n'a encore été déclaré ce cycle.
            'payments_collection_rate' => $this->ratePct($confirmedAmount, $confirmedAmount + $pendingAmount),
            'expenses_pending_count' => (clone $pendingExpenses)->count(),
            'expenses_pending_amount' => (clone $pendingExpenses)->sum('amount'),
            'expenses_confirmed_amount' => $confirmedExpensesAmount,
            'net_result' => $confirmedAmount - $confirmedExpensesAmount,
            'payments_today_amount' => $paymentsTodayAmount,
            'expenses_today_amount' => $expensesTodayAmount,
            'payments_month_amount' => $paymentsMonthAmount,
            'expenses_month_amount' => $expensesMonthAmount,
            'attendance_pending_justifications' => $pendingJustifications,
            'attendance_today_absent' => $todayAbsent,
            // Présent + en retard compté comme "présent" (convention courante
            // d'un taux de présence), sur le mois en cours.
            'attendance_rate' => $thisMonthAttendanceRate,
            'attendance_rate_trend_pt' => $thisMonthAttendanceRate !== null && $lastMonthAttendanceRate !== null
                ? round($thisMonthAttendanceRate - $lastMonthAttendanceRate, 1)
                : null,
        ];
    }

    /**
     * Croissance de l'effectif ce mois-ci : élèves admis ce mois rapportés à
     * l'effectif du mois précédent. Basé sur SchoolStudent::admission_date,
     * déjà renseigné à l'inscription — pas de nouvelle donnée à tracer.
     */
    private function studentsGrowthPct(School $school, int $currentCount): ?float
    {
        $admittedThisMonth = SchoolStudent::query()
            ->where('school_id', $school->id)
            ->where('status', SchoolStudent::STATUS_ACTIVE)
            ->whereBetween('admission_date', [now()->startOfMonth(), now()->endOfMonth()])
            ->count();

        $previousCount = $currentCount - $admittedThisMonth;

        return $this->ratePct($admittedThisMonth, $previousCount);
    }

    /**
     * % de présence (présent + retard compté présent) sur le mois du
     * moment donné, tous niveaux confondus pour l'école.
     */
    private function attendanceRateFor(School $school, Carbon $month): ?float
    {
        $records = Attendance::query()
            ->whereHas('classSubjectTeacher.schoolClass', fn ($query) => $query->where('school_id', $school->id))
            ->whereBetween('date', [$month->copy()->startOfMonth(), $month->copy()->endOfMonth()])
            ->get(['status']);

        if ($records->isEmpty()) {
            return null;
        }

        $present = $records->whereIn('status', [Attendance::STATUS_PRESENT, Attendance::STATUS_RETARD])->count();

        return $this->ratePct($present, $records->count());
    }

    private function ratePct(int|float $numerator, int|float $denominator): ?float
    {
        if ($denominator <= 0) {
            return null;
        }

        return round(($numerator / $denominator) * 100, 1);
    }

    /**
     * Fil d'activité récente : uniquement des événements réellement tracés
     * en base (paiements confirmés, dépenses confirmées, demandes
     * d'inscription, absences justifiées). Pas de "bulletin généré" ni de
     * compteur de questions à l'assistant IA ici — ces événements ne sont pas persistés côté
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

        $expenses = Expense::query()
            ->where('school_id', $school->id)
            ->where('status', Expense::STATUS_CONFIRMED)
            ->whereNotNull('confirmed_at')
            ->with('expenseCategory')
            ->latest('confirmed_at')
            ->limit($limit)
            ->get()
            ->map(fn (Expense $expense) => [
                'type' => 'expense',
                'label' => sprintf(
                    'Dépense confirmée — %s (%s)',
                    $expense->expenseCategory?->name ?? 'catégorie',
                    $expense->supplier_name ?? 'sans fournisseur'
                ),
                'at' => $expense->confirmed_at,
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
            ->concat($expenses)
            ->concat($enrollments)
            ->concat($justifications)
            ->sortByDesc('at')
            ->take($limit)
            ->values();
    }
}
