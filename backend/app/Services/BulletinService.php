<?php

namespace App\Services;

use App\Models\BulletinTemplate;
use App\Models\ClassStudent;
use App\Models\ClassSubjectTeacher;
use App\Models\Grade;
use App\Models\School;
use App\Models\SchoolClass;
use App\Models\Season;
use Illuminate\Support\Collection;

/**
 * Bulletins d'une classe entière pour une période (ou l'année) : il faut
 * toute la classe pour le rang, la moyenne de classe et les plus fortes /
 * faibles moyennes. Le bulletin d'un élève est extrait de ce calcul.
 *
 * Calcul interne sur 20 (comme les notes) ; conversion au barème du modèle
 * de la section (10 ou 20) seulement à la sortie.
 */
class BulletinService
{
    public const TYPE_ANNUEL = 'annuel';

    /**
     * @return array{template: BulletinTemplate, bulletin_type: string, period_label: string, class_size: int, class_average: ?float, students: Collection<string, array>}
     */
    public function forClass(School $school, SchoolClass $class, ?Season $season): array
    {
        $class->loadMissing(['level', 'schoolYear']);
        $template = BulletinTemplate::forSection($school->id, $class->level?->section_id);
        $scale = $template->grading_scale ?: 20;

        $studentIds = ClassStudent::query()
            ->where('class_id', $class->id)
            ->where('status', ClassStudent::STATUS_ACTIVE)
            ->pluck('student_id');

        $assignments = ClassSubjectTeacher::query()
            ->where('class_id', $class->id)
            ->with([
                'subject',
                'teacher',
                'grades' => fn ($query) => $query->whereIn('student_id', $studentIds),
            ])
            ->get();

        $seasons = $season
            ? collect([$season])
            : $class->schoolYear->seasons()->orderBy('order')->get();

        // Moyenne (sur 20) de chaque élève dans chaque matière.
        $averages = []; // [assignment_id][student_id] => ?float
        foreach ($assignments as $assignment) {
            $gradesByStudent = $assignment->grades->groupBy('student_id');
            foreach ($studentIds as $studentId) {
                $averages[$assignment->id][$studentId] = $this->subjectAverage(
                    $gradesByStudent->get($studentId, collect()),
                    $seasons,
                    $template,
                    annual: $season === null,
                );
            }
        }

        // Moyenne générale (sur 20) de chaque élève, pondérée par le coefficient de la matière.
        $overall = [];
        foreach ($studentIds as $studentId) {
            $weighted = 0;
            $coefficients = 0;
            foreach ($assignments as $assignment) {
                $average = $averages[$assignment->id][$studentId];
                if ($average !== null) {
                    $weighted += $average * (float) $assignment->coefficient;
                    $coefficients += (float) $assignment->coefficient;
                }
            }
            $overall[$studentId] = $coefficients > 0 ? $weighted / $coefficients : null;
        }

        $overallRanks = $this->ranks($overall);
        $subjectStats = [];
        foreach ($assignments as $assignment) {
            $values = array_filter($averages[$assignment->id], fn ($value) => $value !== null);
            $subjectStats[$assignment->id] = [
                'class_average' => $values ? array_sum($values) / count($values) : null,
                'min' => $values ? min($values) : null,
                'max' => $values ? max($values) : null,
                'ranks' => $this->ranks($averages[$assignment->id]),
            ];
        }

        $classOverall = array_filter($overall, fn ($value) => $value !== null);
        $toScale = fn (?float $value) => $value === null ? null : round($value * $scale / 20, 2);

        $students = $studentIds->mapWithKeys(function ($studentId) use ($assignments, $averages, $subjectStats, $overall, $overallRanks, $template, $toScale, $season) {
            $average = $toScale($overall[$studentId]);
            $passed = $season === null && $average !== null ? $average >= $template->passThreshold() : null;
            $decision = $passed === null ? null : ($passed ? $template->pass_label : $template->fail_label);

            return [$studentId => [
                'subjects' => $assignments->map(fn (ClassSubjectTeacher $assignment) => [
                    'subject' => $assignment->subject?->name,
                    'teacher' => $assignment->teacher?->fullname,
                    'coefficient' => (float) $assignment->coefficient,
                    'grades_count' => $assignment->grades->where('student_id', $studentId)
                        ->when($season, fn ($grades) => $grades->where('season_id', $season->id))
                        ->count(),
                    'average' => $toScale($averages[$assignment->id][$studentId]),
                    'class_average' => $toScale($subjectStats[$assignment->id]['class_average']),
                    'min' => $toScale($subjectStats[$assignment->id]['min']),
                    'max' => $toScale($subjectStats[$assignment->id]['max']),
                    'rank' => $subjectStats[$assignment->id]['ranks'][$studentId] ?? null,
                ])->values()->all(),
                'overall_average' => $average,
                'rank' => $overallRanks[$studentId] ?? null,
                'distinction' => $template->distinctionFor($average),
                'decision' => $decision,
                'passed' => $passed,
            ]];
        });

        return [
            'template' => $template,
            'bulletin_type' => $season?->type ?? self::TYPE_ANNUEL,
            'period_label' => $season?->label ?? "Bulletin annuel — {$class->schoolYear->label}",
            'class_size' => $studentIds->count(),
            'class_average' => $toScale($classOverall ? array_sum($classOverall) / count($classOverall) : null),
            'students' => $students,
        ];
    }

    /**
     * Moyenne d'une matière (sur 20). Période : moyenne pondérée des notes.
     * Année : moyenne des moyennes de chaque période où l'élève a des notes
     * (une période sans note ne compte pas comme 0).
     *
     * @param  Collection<int, Grade>  $grades
     * @param  Collection<int, Season>  $seasons
     */
    private function subjectAverage(Collection $grades, Collection $seasons, BulletinTemplate $template, bool $annual): ?float
    {
        $periodAverages = [];

        foreach ($seasons as $season) {
            $seasonGrades = $grades->where('season_id', $season->id);
            $totalWeight = $seasonGrades->sum(fn (Grade $grade) => $template->weightFor($grade));

            if ($totalWeight > 0) {
                $periodAverages[] = $seasonGrades->sum(
                    fn (Grade $grade) => ($grade->score / $grade->max_score) * 20 * $template->weightFor($grade)
                ) / $totalWeight;
            }
        }

        if ($periodAverages === []) {
            return null;
        }

        return $annual ? array_sum($periodAverages) / count($periodAverages) : $periodAverages[0];
    }

    /**
     * Rang « olympique » : ex aequo au même rang, le suivant saute
     * (16, 15, 15, 12 → 1, 2, 2, 4). Les élèves sans moyenne n'ont pas de rang.
     *
     * @param  array<string, ?float>  $values
     * @return array<string, int>
     */
    private function ranks(array $values): array
    {
        $values = array_filter($values, fn ($value) => $value !== null);
        arsort($values);

        $ranks = [];
        $position = 0;
        $previous = null;
        $previousRank = 0;
        foreach ($values as $studentId => $value) {
            $position++;
            $rounded = round($value, 4);
            $ranks[$studentId] = $rounded === $previous ? $previousRank : $position;
            $previous = $rounded;
            $previousRank = $ranks[$studentId];
        }

        return $ranks;
    }
}
