<?php

namespace App\Http\Controllers\Api;

use App\Models\Grade;
use App\Models\School;
use App\Models\ClassStudent;
use Illuminate\Http\Request;
use App\Models\TimetableSlot;
use Illuminate\Support\Collection;
use App\Http\Controllers\Controller;
use App\Services\StudentRiskService;
use App\Services\SchoolSummaryService;
use App\Http\Controllers\Api\Concerns\ValidatesSchoolSection;
use App\Http\Controllers\Api\Concerns\AuthorizesSchoolDirecteur;

class DashboardController extends Controller
{
    use AuthorizesSchoolDirecteur, ValidatesSchoolSection;

    private const STAFF_ROLE_SLUGS = ['fondateur', 'directeur', 'censeur', 'surveillant', 'secretaire', 'comptable'];

    /**
     * Chiffres clés + actions en attente pour le tableau de bord du
     * personnel (directeur, censeur, surveillant, secrétariat, comptable).
     * Désormais filtrés selon les sections affectées à l'utilisateur.
     */
    public function summary(Request $request, School $school, SchoolSummaryService $summaryService)
    {
        $this->authorizeRoles($request, $school, self::STAFF_ROLE_SLUGS, "Vous n'avez pas accès à ce résumé.");
        $sectionIds = $this->restrictedSectionIds($request, $school);

        return response()->json([
            ...$summaryService->summary($school, $sectionIds),
            'recent_activity' => $summaryService->recentActivity($school, 6, $sectionIds),
            'monthly_trend' => $summaryService->monthlyTrend($school, 6, $sectionIds),
        ]);
    }

    /**
     * Résumé pour un élève avec son propre compte : uniquement des chiffres
     * généraux sur l'école et ses propres statistiques scolaires.
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
     * temps du jour et la moyenne de ses classes.
     */
    public function teacherSummary(Request $request, School $school)
    {
        $userId = $request->user()->id;
        $sectionIds = $this->restrictedSectionIds($request, $school);

        $assignments = $request->user()->teachingAssignments()
            ->whereHas('schoolClass', fn ($query) => $query
                ->where('school_id', $school->id)
                ->whereHas('schoolYear', fn ($q) => $q->where('is_current', true))
                ->when($sectionIds, fn ($classQuery, $ids) => $classQuery->whereIn('section_id', $ids)))
            ->with(['subject', 'schoolClass'])
            ->get();

        $classIds = $assignments->pluck('class_id')->unique()->values();

        $studentsCount = $classIds->isEmpty() ? 0 : ClassStudent::query()
            ->whereIn('class_id', $classIds)
            ->where('status', ClassStudent::STATUS_ACTIVE)
            ->distinct('student_id')
            ->count('student_id');

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