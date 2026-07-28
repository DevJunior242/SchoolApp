<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Api\Concerns\AuthorizesSchoolDirecteur;
use App\Http\Controllers\Api\Concerns\AuthorizesStudentHealth;
use App\Http\Controllers\Controller;
use App\Models\ClassStudent;
use App\Models\School;
use App\Models\StudentAllergy;
use App\Models\StudentMedicalVisit;
use App\Models\StudentMedication;
use App\Models\StudentVaccination;
use Illuminate\Http\Request;

class HealthDashboardController extends Controller
{
    use AuthorizesSchoolDirecteur;
    use AuthorizesStudentHealth;

    public function summary(Request $request, School $school)
    {
        $this->authorizeHealthManager($request, $school);

        $enrolledStudentIds = ClassStudent::query()
            ->where('status', ClassStudent::STATUS_ACTIVE)
            ->whereHas('schoolClass', fn ($query) => $query->where('school_id', $school->id))
            ->pluck('student_id')
            ->unique();

        $today = now()->toDateString();

        return response()->json([
            'visits_today' => StudentMedicalVisit::query()
                ->where('school_id', $school->id)
                ->whereDate('visited_at', $today)
                ->count(),
            'students_under_treatment' => StudentMedication::query()
                ->whereIn('student_id', $enrolledStudentIds)
                ->where('starts_on', '<=', $today)
                ->where(fn ($query) => $query->whereNull('ends_on')->orWhere('ends_on', '>=', $today))
                ->distinct('student_id')
                ->count('student_id'),
            'allergic_students' => StudentAllergy::query()
                ->whereIn('student_id', $enrolledStudentIds)
                ->distinct('student_id')
                ->count('student_id'),
            'vaccines_due_soon' => StudentVaccination::query()
                ->whereIn('student_id', $enrolledStudentIds)
                ->whereNotNull('expires_at')
                ->whereBetween('expires_at', [$today, now()->addDays(30)->toDateString()])
                ->count(),
            'emergencies_recorded' => StudentMedicalVisit::query()
                ->where('school_id', $school->id)
                ->where('is_emergency', true)
                ->count(),
        ]);
    }
}
