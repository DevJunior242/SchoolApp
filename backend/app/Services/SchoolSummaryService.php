<?php

namespace App\Services;

use Carbon\Carbon;
use App\Models\School;
use App\Models\Expense;
use App\Models\Payment;
use App\Models\Attendance;
use App\Models\SchoolUser;
use App\Models\SchoolClass;
use App\Models\SchoolStudent;
use App\Models\EnrollmentRequest;
use Illuminate\Support\Collection;

/**
 * Chiffres clés de l'école, réutilisés par le tableau de bord du personnel
 * (DashboardController) et par l'assistant IA (même source de vérité, pas
 * de calcul dupliqué).
 */
class SchoolSummaryService
{
    public function summary(School $school, ?array $sectionIds = null): array
    {
        $studentsCount = SchoolStudent::query()
            ->where('school_id', $school->id)
            ->where('status', SchoolStudent::STATUS_ACTIVE)
            ->when($sectionIds, fn ($query, $ids) => $query->whereHas('schoolClass', fn ($q) => $q->whereIn('section_id', $ids)))
            ->count();

        $teachersCount = SchoolUser::query()
            ->where('school_id', $school->id)
            ->whereHas('role', fn ($query) => $query->where('slug', 'professeur'))
            ->when($sectionIds, fn ($query, $ids) => $query->whereHas('sections', fn ($q) => $q->whereIn('sections.id', $ids)))
            ->count();

        $classesCount = SchoolClass::query()
            ->where('school_id', $school->id)
            ->whereHas('schoolYear', fn ($query) => $query->where('is_current', true))
            ->when($sectionIds, fn ($query, $ids) => $query->whereIn('section_id', $ids))
            ->count();

        $pendingPayments = Payment::query()
            ->where('school_id', $school->id)
            ->where('status', Payment::STATUS_PENDING)
            ->when($sectionIds, fn ($query, $ids) => $query->whereHas('student.schoolClass', fn ($q) => $q->whereIn('section_id', $ids)));

        $confirmedAmount = Payment::query()
            ->where('school_id', $school->id)
            ->where('status', Payment::STATUS_CONFIRMED)
            ->when($sectionIds, fn ($query, $ids) => $query->whereHas('student.schoolClass', fn ($q) => $q->whereIn('section_id', $ids)))
            ->sum('amount');

        $pendingJustifications = Attendance::query()
            ->where('justification_status', Attendance::JUSTIFICATION_EN_ATTENTE)
            ->whereHas('classSubjectTeacher.schoolClass', fn ($query) => $query
                ->where('school_id', $school->id)
                ->when($sectionIds, fn ($q, $ids) => $q->whereIn('section_id', $ids))
            )
            ->count();

        $todayAbsent = Attendance::query()
            ->where('status', Attendance::STATUS_ABSENT)
            ->where('date', now()->toDateString())
            ->whereHas('classSubjectTeacher.schoolClass', fn ($query) => $query
                ->where('school_id', $school->id)
                ->when($sectionIds, fn ($q, $ids) => $q->whereIn('section_id', $ids))
            )
            ->count();

        $pendingAmount = (clone $pendingPayments)->sum('amount');

        $pendingExpenses = Expense::query()
            ->where('school_id', $school->id)
            ->where('status', Expense::STATUS_PENDING)
            ->when($sectionIds, fn ($query, $ids) => $query->whereIn('section_id', $ids));

        $confirmedExpensesAmount = Expense::query()
            ->where('school_id', $school->id)
            ->where('status', Expense::STATUS_CONFIRMED)
            ->when($sectionIds, fn ($query, $ids) => $query->whereIn('section_id', $ids))
            ->sum('amount');

        $thisMonthAttendanceRate = $this->attendanceRateFor($school, now(), $sectionIds);
        $lastMonthAttendanceRate = $this->attendanceRateFor($school, now()->subMonthNoOverflow(), $sectionIds);

        $paymentsTodayAmount = Payment::query()
            ->where('school_id', $school->id)
            ->where('status', Payment::STATUS_CONFIRMED)
            ->whereDate('confirmed_at', now()->toDateString())
            ->when($sectionIds, fn ($query, $ids) => $query->whereHas('student.schoolClass', fn ($q) => $q->whereIn('section_id', $ids)))
            ->sum('amount');

        $expensesTodayAmount = Expense::query()
            ->where('school_id', $school->id)
            ->where('status', Expense::STATUS_CONFIRMED)
            ->whereDate('confirmed_at', now()->toDateString())
            ->when($sectionIds, fn ($query, $ids) => $query->whereIn('section_id', $ids))
            ->sum('amount');

        $paymentsMonthAmount = Payment::query()
            ->where('school_id', $school->id)
            ->where('status', Payment::STATUS_CONFIRMED)
            ->whereBetween('confirmed_at', [now()->startOfMonth(), now()->endOfMonth()])
            ->when($sectionIds, fn ($query, $ids) => $query->whereHas('student.schoolClass', fn ($q) => $q->whereIn('section_id', $ids)))
            ->sum('amount');

        $expensesMonthAmount = Expense::query()
            ->where('school_id', $school->id)
            ->where('status', Expense::STATUS_CONFIRMED)
            ->whereBetween('confirmed_at', [now()->startOfMonth(), now()->endOfMonth()])
            ->when($sectionIds, fn ($query, $ids) => $query->whereIn('section_id', $ids))
            ->sum('amount');

        return [
            'students_count' => $studentsCount,
            'students_growth_pct' => $this->studentsGrowthPct($school, $studentsCount, $sectionIds),
            'teachers_count' => $teachersCount,
            'classes_count' => $classesCount,
            'payments_pending_count' => (clone $pendingPayments)->count(),
            'payments_pending_amount' => $pendingAmount,
            'payments_confirmed_amount' => $confirmedAmount,
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
            'attendance_rate' => $thisMonthAttendanceRate,
            'attendance_rate_trend_pt' => $thisMonthAttendanceRate !== null && $lastMonthAttendanceRate !== null
                ? round($thisMonthAttendanceRate - $lastMonthAttendanceRate, 1)
                : null,
        ];
    }

    public function monthlyTrend(School $school, int $months = 6, ?array $sectionIds = null): array
    {
        $result = [];

        for ($i = $months - 1; $i >= 0; $i--) {
            $monthStart = now()->subMonthsNoOverflow($i)->startOfMonth();
            $monthEnd = $monthStart->copy()->endOfMonth();

            $payments = Payment::query()
                ->where('school_id', $school->id)
                ->where('status', Payment::STATUS_CONFIRMED)
                ->whereBetween('confirmed_at', [$monthStart, $monthEnd])
                ->when($sectionIds, fn ($query, $ids) => $query->whereHas('student.schoolClass', fn ($q) => $q->whereIn('section_id', $ids)))
                ->sum('amount');

            $expenses = Expense::query()
                ->where('school_id', $school->id)
                ->where('status', Expense::STATUS_CONFIRMED)
                ->whereBetween('confirmed_at', [$monthStart, $monthEnd])
                ->when($sectionIds, fn ($query, $ids) => $query->whereIn('section_id', $ids))
                ->sum('amount');

            $result[] = [
                'month' => $monthStart->format('Y-m'),
                'label' => ucfirst($monthStart->locale('fr')->isoFormat('MMM')),
                'payments' => (float) $payments,
                'expenses' => (float) $expenses,
            ];
        }

        return $result;
    }

    private function studentsGrowthPct(School $school, int $currentCount, ?array $sectionIds = null): ?float
    {
        $admittedThisMonth = SchoolStudent::query()
            ->where('school_id', $school->id)
            ->where('status', SchoolStudent::STATUS_ACTIVE)
            ->whereBetween('admission_date', [now()->startOfMonth(), now()->endOfMonth()])
            ->when($sectionIds, fn ($query, $ids) => $query->whereHas('schoolClass', fn ($q) => $q->whereIn('section_id', $ids)))
            ->count();

        $previousCount = $currentCount - $admittedThisMonth;

        return $this->ratePct($admittedThisMonth, $previousCount);
    }

    private function attendanceRateFor(School $school, Carbon $month, ?array $sectionIds = null): ?float
    {
        $records = Attendance::query()
            ->whereHas('classSubjectTeacher.schoolClass', fn ($query) => $query
                ->where('school_id', $school->id)
                ->when($sectionIds, fn ($q, $ids) => $q->whereIn('section_id', $ids))
            )
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

    public function recentActivity(School $school, int $limit = 6, ?array $sectionIds = null): Collection
    {
        $payments = Payment::query()
            ->where('school_id', $school->id)
            ->where('status', Payment::STATUS_CONFIRMED)
            ->whereNotNull('confirmed_at')
            ->when($sectionIds, fn ($query, $ids) => $query->whereHas('student.schoolClass', fn ($q) => $q->whereIn('section_id', $ids)))
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
            ->when($sectionIds, fn ($query, $ids) => $query->whereIn('section_id', $ids))
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
            ->when($sectionIds, fn ($query, $ids) => $query->whereIn('section_id', $ids))
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
            ->whereHas('classSubjectTeacher.schoolClass', fn ($query) => $query
                ->where('school_id', $school->id)
                ->when($sectionIds, fn ($q, $ids) => $q->whereIn('section_id', $ids))
            )
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