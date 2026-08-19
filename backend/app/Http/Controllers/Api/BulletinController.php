<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Api\Concerns\AuthorizesSchoolDirecteur;
use App\Http\Controllers\Controller;
use App\Models\ClassStudent;
use App\Models\ClassSubjectTeacher;
use App\Models\Grade;
use App\Models\ParentStudent;
use App\Models\School;
use App\Models\SchoolUser;
use App\Models\Season;
use App\Models\Student;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;

class BulletinController extends Controller
{
    use AuthorizesSchoolDirecteur;

    const MENTION_ADMIS = 'Admis(e) en classe supérieure';

    const MENTION_REDOUBLE = 'Doit redoubler';

    /**
     * Bulletin d'un élève. Avec `season_id`, ne montre que ce trimestre/
     * semestre précis. Sans, c'est le bulletin annuel : la moyenne de
     * chaque matière est la moyenne des moyennes de chaque période (pas un
     * pool de toutes les notes de l'année, qui donnerait un poids inégal
     * aux périodes selon leur nombre de notes).
     */
    public function show(Request $request, School $school, Student $student)
    {
        $this->authorizeBulletinViewer($request, $school, $student);

        $validated = $request->validate([
            'season_id' => ['nullable', 'uuid', 'exists:seasons,id'],
        ]);
        $seasonId = $validated['season_id'] ?? null;

        $classStudent = ClassStudent::query()
            ->where('student_id', $student->id)
            ->where('status', ClassStudent::STATUS_ACTIVE)
            ->whereHas('schoolClass', fn ($query) => $query->where('school_id', $school->id))
            ->latest('created_at')
            ->first();

        if (! $classStudent) {
            return response()->json(['message' => "Cet élève n'est inscrit dans aucune classe active."], 404);
        }

        $schoolYear = $classStudent->schoolClass->schoolYear;
        $selectedSeason = $seasonId ? Season::query()->find($seasonId) : null;

        $assignments = ClassSubjectTeacher::query()
            ->where('class_id', $classStudent->class_id)
            ->with([
                'subject',
                'teacher',
                'grades' => fn ($query) => $query->where('student_id', $student->id),
            ])
            ->get();

        if ($selectedSeason) {
            $subjects = $assignments->map(fn (ClassSubjectTeacher $assignment) => $this->subjectForSeason(
                $assignment,
                $assignment->grades->where('season_id', $selectedSeason->id)
            ));
            $bulletinType = $selectedSeason->type;
            $periodLabel = $selectedSeason->label;
        } else {
            $seasons = $schoolYear->seasons()->orderBy('order')->get();
            $subjects = $assignments->map(fn (ClassSubjectTeacher $assignment) => $this->subjectForYear($assignment, $seasons));
            $bulletinType = 'annuel';
            $periodLabel = "Bulletin annuel — {$schoolYear->label}";
        }

        // La moyenne générale pondère chaque matière par son coefficient
        // (Maths coef 4 pèse plus que Musique coef 1), pas une simple
        // moyenne à plat des moyennes de matières.
        $withAverage = $subjects->filter(fn ($s) => $s['average'] !== null);
        $totalCoefficient = $withAverage->sum('coefficient');
        $overallAverage = $totalCoefficient > 0
            ? round($withAverage->sum(fn ($s) => $s['average'] * $s['coefficient']) / $totalCoefficient, 2)
            : null;

        // La mention (passage/redoublement) ne concerne que le bulletin de
        // fin d'année, pas un bulletin de trimestre/semestre isolé.
        $mention = null;
        if (! $selectedSeason && $overallAverage !== null) {
            $mention = $overallAverage >= 10 ? self::MENTION_ADMIS : self::MENTION_REDOUBLE;
        }

        return response()->json([
            'student' => ['id' => $student->id, 'fullname' => $student->fullname],
            'season_id' => $seasonId,
            'bulletin_type' => $bulletinType,
            'period_label' => $periodLabel,
            'subjects' => $subjects->values(),
            'overall_average' => $overallAverage,
            'mention' => $mention,
        ]);
    }

    /**
     * Moyenne d'une matière sur une seule période : pondérée par le
     * coefficient de chaque note (composition compte plus qu'un devoir).
     */
    private function subjectForSeason(ClassSubjectTeacher $assignment, Collection $grades): array
    {
        $totalWeight = $grades->sum('coefficient');
        $average = $totalWeight > 0
            ? round($grades->sum(fn (Grade $g) => ($g->score / $g->max_score) * 20 * $g->coefficient) / $totalWeight, 2)
            : null;

        return [
            'subject' => $assignment->subject->name,
            'teacher' => $assignment->teacher->fullname,
            'coefficient' => (float) $assignment->coefficient,
            'grades_count' => $grades->count(),
            'average' => $average,
        ];
    }

    /**
     * Moyenne annuelle d'une matière : moyenne des moyennes de chaque
     * période où l'élève a eu au moins une note (les périodes sans note
     * n'entrent pas dans le calcul, plutôt que de compter comme 0).
     */
    private function subjectForYear(ClassSubjectTeacher $assignment, Collection $seasons): array
    {
        $periodAverages = [];

        foreach ($seasons as $season) {
            $seasonGrades = $assignment->grades->where('season_id', $season->id);
            $totalWeight = $seasonGrades->sum('coefficient');

            if ($totalWeight > 0) {
                $periodAverages[] = $seasonGrades->sum(fn (Grade $g) => ($g->score / $g->max_score) * 20 * $g->coefficient) / $totalWeight;
            }
        }

        $average = count($periodAverages) > 0
            ? round(array_sum($periodAverages) / count($periodAverages), 2)
            : null;

        return [
            'subject' => $assignment->subject->name,
            'teacher' => $assignment->teacher->fullname,
            'coefficient' => (float) $assignment->coefficient,
            'grades_count' => $assignment->grades->count(),
            'average' => $average,
        ];
    }

    /**
     * Le directeur consulte le bulletin de n'importe quel élève de son
     * école ; un parent ne consulte que celui de ses propres enfants ; un
     * élève majeur avec son propre compte consulte le sien.
     */
    private function authorizeBulletinViewer(Request $request, School $school, Student $student): void
    {
        $userId = $request->user()->id;

        if ($student->user_id === $userId) {
            return;
        }

        $isDirecteur = SchoolUser::query()
            ->where('school_id', $school->id)
            ->where('user_id', $userId)
            ->whereHas('role', fn ($query) => $query->where('slug', 'directeur'))
            ->exists();

        if ($isDirecteur) {
            return;
        }

        $isParent = ParentStudent::query()
            ->where('parent_user_id', $userId)
            ->where('student_id', $student->id)
            ->exists();

        abort_unless($isParent, 403, "Vous n'êtes pas autorisé à consulter ce bulletin.");
    }
}
