<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Api\Concerns\AuthorizesSchoolDirecteur;
use App\Http\Controllers\Controller;
use App\Models\Attendance;
use App\Models\Payment;
use App\Models\School;
use App\Models\SchoolClass;
use App\Models\SchoolStudent;
use App\Models\SchoolUser;
use Illuminate\Http\Request;

class DashboardController extends Controller
{
    use AuthorizesSchoolDirecteur;

    private const STAFF_ROLE_SLUGS = ['directeur', 'censeur', 'surveillant', 'secretaire', 'comptable'];

    /**
     * Chiffres clés + actions en attente pour le tableau de bord du
     * personnel (directeur, censeur, surveillant, secrétariat, comptable).
     */
    public function summary(Request $request, School $school)
    {
        $this->authorizeRoles($request, $school, self::STAFF_ROLE_SLUGS, "Vous n'avez pas accès à ce résumé.");

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

        return response()->json([
            'students_count' => $studentsCount,
            'teachers_count' => $teachersCount,
            'classes_count' => $classesCount,
            'payments_pending_count' => (clone $pendingPayments)->count(),
            'payments_pending_amount' => (clone $pendingPayments)->sum('amount'),
            'payments_confirmed_amount' => $confirmedAmount,
            'attendance_pending_justifications' => $pendingJustifications,
            'attendance_today_absent' => $todayAbsent,
        ]);
    }
}
