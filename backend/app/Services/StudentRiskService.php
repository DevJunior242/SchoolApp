<?php

namespace App\Services;

use App\Models\Attendance;
use App\Models\ClassStudent;
use App\Models\FeeStructure;
use App\Models\Grade;
use App\Models\Payment;
use App\Models\School;
use App\Models\SchoolStudent;
use App\Models\Student;
use Illuminate\Support\Collection;

/**
 * Score de risque d'abandon scolaire : un système de points (règle métier),
 * pas de machine learning. Sert aussi de prérequis pour une future IA
 * prédictive : le "vrai" signal d'abandon (SchoolStudent::STATUS_LEFT) est
 * déjà tracké dans le schéma existant, donc on aura de quoi entraîner un
 * modèle plus tard sans migration supplémentaire.
 */
class StudentRiskService
{
    const RISK_HIGH = 'eleve';

    const RISK_MEDIUM = 'moyen';

    const RISK_LOW = 'faible';

    const POINTS_ABSENCES = 30;

    const POINTS_MOYENNE = 25;

    const POINTS_RETARDS = 20;

    const POINTS_PAIEMENT = 15;

    const THRESHOLD_ABSENCES = 15;

    const THRESHOLD_MOYENNE = 10;

    const THRESHOLD_RETARDS = 10;

    /**
     * @return Collection<int, array<string, mixed>>
     */
    public function reportForSchool(School $school): Collection
    {
        return SchoolStudent::query()
            ->where('school_id', $school->id)
            ->where('status', SchoolStudent::STATUS_ACTIVE)
            ->with('student')
            ->get()
            ->map(fn (SchoolStudent $schoolStudent) => $this->scoreFor($school, $schoolStudent->student))
            ->sortByDesc('score')
            ->values();
    }

    /**
     * @return array<string, mixed>
     */
    public function scoreFor(School $school, Student $student): array
    {
        $classStudent = ClassStudent::query()
            ->where('student_id', $student->id)
            ->where('status', ClassStudent::STATUS_ACTIVE)
            ->whereHas('schoolClass', fn ($query) => $query->where('school_id', $school->id))
            ->latest('created_at')
            ->with('schoolClass')
            ->first();

        $schoolYearId = $classStudent?->schoolClass?->school_year_id;

        $absences = Attendance::query()
            ->where('student_id', $student->id)
            ->where('status', Attendance::STATUS_ABSENT)
            ->when($schoolYearId, fn ($query) => $query->whereHas(
                'classSubjectTeacher.schoolClass',
                fn ($q) => $q->where('school_year_id', $schoolYearId)
            ))
            ->count();

        $retards = Attendance::query()
            ->where('student_id', $student->id)
            ->where('status', Attendance::STATUS_RETARD)
            ->when($schoolYearId, fn ($query) => $query->whereHas(
                'classSubjectTeacher.schoolClass',
                fn ($q) => $q->where('school_year_id', $schoolYearId)
            ))
            ->count();

        $grades = Grade::query()
            ->where('student_id', $student->id)
            ->when($schoolYearId, fn ($query) => $query->whereHas(
                'classSubjectTeacher.schoolClass',
                fn ($q) => $q->where('school_year_id', $schoolYearId)
            ))
            ->get();

        $totalWeight = $grades->sum('coefficient');
        $average = $totalWeight > 0
            ? round($grades->sum(fn (Grade $g) => ($g->score / $g->max_score) * 20 * $g->coefficient) / $totalWeight, 2)
            : null;

        $hasPaymentDelay = false;

        if ($classStudent) {
            $totalDue = FeeStructure::query()
                ->where('school_id', $school->id)
                ->where('level_id', $classStudent->schoolClass->level_id)
                ->where('school_year_id', $schoolYearId)
                ->where('due_date', '<', now())
                ->sum('amount');

            $totalConfirmed = Payment::query()
                ->where('school_id', $school->id)
                ->where('student_id', $student->id)
                ->where('status', Payment::STATUS_CONFIRMED)
                ->sum('amount');

            $hasPaymentDelay = $totalDue > $totalConfirmed;
        }

        $score = 0;
        $score += $absences > self::THRESHOLD_ABSENCES ? self::POINTS_ABSENCES : 0;
        $score += ($average !== null && $average < self::THRESHOLD_MOYENNE) ? self::POINTS_MOYENNE : 0;
        $score += $retards > self::THRESHOLD_RETARDS ? self::POINTS_RETARDS : 0;
        $score += $hasPaymentDelay ? self::POINTS_PAIEMENT : 0;

        $level = match (true) {
            $score >= 70 => self::RISK_HIGH,
            $score >= 40 => self::RISK_MEDIUM,
            default => self::RISK_LOW,
        };

        return [
            'student_id' => $student->id,
            'fullname' => $student->fullname,
            'matricule' => $student->matricule,
            'absences' => $absences,
            'retards' => $retards,
            'average' => $average,
            'payment_delay' => $hasPaymentDelay,
            'score' => $score,
            'level' => $level,
        ];
    }
}
