<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Api\Concerns\AuthorizesSchoolDirecteur;
use App\Http\Controllers\Controller;
use App\Models\ClassStudent;
use App\Models\Grade;
use App\Models\School;
use App\Models\TimetableSlot;
use App\Services\SchoolSummaryService;
use App\Services\StudentRiskService;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;

class DashboardController extends Controller
{
    use AuthorizesSchoolDirecteur;

    private const STAFF_ROLE_SLUGS = ['directeur', 'censeur', 'surveillant', 'secretaire', 'comptable'];

    /**
     * Chiffres clés + actions en attente pour le tableau de bord du
     * personnel (directeur, censeur, surveillant, secrétariat, comptable).
     */
    public function summary(Request $request, School $school, SchoolSummaryService $summaryService)
    {
        $this->authorizeRoles($request, $school, self::STAFF_ROLE_SLUGS, "Vous n'avez pas accès à ce résumé.");

        return response()->json([
            ...$summaryService->summary($school),
            'recent_activity' => $summaryService->recentActivity($school),
            'monthly_trend' => $summaryService->monthlyTrend($school),
        ]);
    }

    /**
     * Résumé pour un élève avec son propre compte : uniquement des chiffres
     * généraux sur l'école (effectifs, jamais de montant/paiement d'un
     * autre élève) et ses propres statistiques scolaires — pas le résumé
     * du personnel, qui contient des données financières et l'activité de
     * toute l'école.
     */
    public function studentSummary(Request $request, School $school, SchoolSummaryService $summaryService, StudentRiskService $riskService)
    {
        $student = $request->user()->studentProfile;
        abort_unless($student, 404, "Aucune fiche élève associée à ce compte.");

        $schoolSummary = $summaryService->summary($school);
        $myScore = $riskService->scoreFor($school, $student);

        return response()->json([
            'school' => [
                'students_count' => $schoolSummary['students_count'],
                'teachers_count' => $schoolSummary['teachers_count'],
                'classes_count' => $schoolSummary['classes_count'],
            ],
            'me' => [
                'average' => $myScore['average'],
                'absences' => $myScore['absences'],
                'retards' => $myScore['retards'],
            ],
        ]);
    }

    /**
     * Résumé pour un professeur : ses classes/matières/élèves, son emploi du
     * temps du jour et la moyenne de ses classes — jamais les finances ni
     * les autres enseignants. Toutes les requêtes sont groupées (une passe
     * sur les affectations, une sur les notes, une sur les élèves) au lieu
     * de boucler par classe, pour éviter le N+1.
     */
    public function teacherSummary(Request $request, School $school)
    {
        $userId = $request->user()->id;

        $assignments = $request->user()->teachingAssignments()
            ->whereHas('schoolClass', fn ($query) => $query
                ->where('school_id', $school->id)
                ->whereHas('schoolYear', fn ($q) => $q->where('is_current', true)))
            ->with(['subject', 'schoolClass'])
            ->get();

        $classIds = $assignments->pluck('class_id')->unique()->values();

        $studentsCount = $classIds->isEmpty() ? 0 : ClassStudent::query()
            ->whereIn('class_id', $classIds)
            ->where('status', ClassStudent::STATUS_ACTIVE)
            ->distinct('student_id')
            ->count('student_id');

        // Une seule requête pour toutes les notes de toutes les classes,
        // regroupées ensuite en mémoire par classe — pas une requête par
        // affectation.
        $assignmentIds = $assignments->pluck('id');
        $grades = $assignmentIds->isEmpty() ? collect() : Grade::query()
            ->whereIn('class_subject_teacher_id', $assignmentIds)
            ->get(['class_subject_teacher_id', 'score', 'max_score', 'coefficient']);

        $classNameByAssignment = $assignments->pluck('schoolClass.name', 'id');

        $averageByClass = $grades
            ->groupBy(fn (Grade $grade) => $classNameByAssignment[$grade->class_subject_teacher_id] ?? 'Classe inconnue')
            ->map(function (Collection $group, string $className) {
                $totalWeight = $group->sum('coefficient');

                return [
                    'classe' => $className,
                    'moyenne' => $totalWeight > 0
                        ? round($group->sum(fn (Grade $g) => ($g->score / $g->max_score) * 20 * $g->coefficient) / $totalWeight, 2)
                        : null,
                ];
            })
            ->filter(fn ($row) => $row['moyenne'] !== null)
            ->values();

        $todaySlots = TimetableSlot::query()
            ->whereHas('classSubjectTeacher', fn ($query) => $query
                ->where('user_id', $userId)
                ->whereHas('schoolClass', fn ($q) => $q->where('school_id', $school->id)))
            ->where('day_of_week', now()->dayOfWeekIso)
            ->with(['classSubjectTeacher.subject', 'classSubjectTeacher.schoolClass'])
            ->orderBy('start_time')
            ->get()
            ->map(fn (TimetableSlot $slot) => [
                'start_time' => substr($slot->start_time, 0, 5),
                'end_time' => substr($slot->end_time, 0, 5),
                'subject' => $slot->classSubjectTeacher->subject?->name,
                'classe' => $slot->classSubjectTeacher->schoolClass?->name,
                'room' => $slot->room,
            ]);

        return response()->json([
            'classes_count' => $classIds->count(),
            'subjects_count' => $assignments->pluck('subject_id')->unique()->count(),
            'students_count' => $studentsCount,
            'today_slots' => $todaySlots,
            'average_by_class' => $averageByClass,
        ]);
    }
}
