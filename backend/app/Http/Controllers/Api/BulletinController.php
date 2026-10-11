<?php

namespace App\Http\Controllers\Api;

use App\Models\SchoolClass;
use App\Models\School;
use App\Models\Season;
use App\Models\Student;
use App\Models\SchoolUser;
use App\Models\ClassStudent;
use Illuminate\Http\Request;
use App\Models\ParentStudent;
use App\Services\BulletinService;
use Illuminate\Http\JsonResponse;
use App\Http\Controllers\Controller;
use App\Http\Controllers\Api\Concerns\ValidatesSchoolSection;
use App\Http\Controllers\Api\Concerns\AuthorizesSchoolDirecteur;

class BulletinController extends Controller
{
    use AuthorizesSchoolDirecteur, ValidatesSchoolSection;

    /**
     * Bulletin d'un élève. Avec `season_id`, ne montre que ce trimestre/
     * semestre précis. Sans, c'est le bulletin annuel : la moyenne de
     * chaque matière est la moyenne des moyennes de chaque période (pas un
     * pool de toutes les notes de l'année, qui donnerait un poids inégal
     * aux périodes selon leur nombre de notes). Calcul et présentation
     * selon le modèle de bulletin de la section (BulletinService).
     */
    public function show(Request $request, School $school, Student $student, BulletinService $service)
    {
        $this->authorizeBulletinViewer($request, $school, $student);

        $validated = $request->validate([
            'season_id' => ['nullable', 'uuid', 'exists:seasons,id'],
        ]);

        $classStudent = ClassStudent::query()
            ->where('student_id', $student->id)
            ->where('status', ClassStudent::STATUS_ACTIVE)
            ->whereHas('schoolClass', fn($query) => $query->where('school_id', $school->id))
            ->latest('created_at')
            ->first();

        if (! $classStudent) {
            return response()->json(['message' => "Cet élève n'est inscrit dans aucune classe active."], 404);
        }

        // Le bulletin ne porte pas de section : elle est celle de la classe
        // active de l'élève pour l'année consultée.
        $this->authorizeLevelSection(
            $request,
            $school,
            $this->activeSchoolClass($school, $classStudent->schoolClass)
        );

        $seasonId = $validated['season_id'] ?? null;
        $result = $this->computeForClass($school, $classStudent->schoolClass, $seasonId, $service);
        if ($result instanceof JsonResponse) {
            return $result;
        }

        return response()->json($this->studentPayload($school, $classStudent->schoolClass, $student, $result, $seasonId));
    }

    /**
     * Bulletins de toute une classe (impression groupée), réservé à
     * l'administrateur, section respectée.
     */
    public function forClass(Request $request, School $school, SchoolClass $schoolClass, BulletinService $service)
    {
        $this->authorizeRoles($request, $school, ['admin'], 'Seul l’administrateur peut éditer les bulletins de toute une classe.');
        $this->authorizeLevelSection($request, $school, $this->activeSchoolClass($school, $schoolClass));

        $validated = $request->validate([
            'season_id' => ['nullable', 'uuid', 'exists:seasons,id'],
        ]);
        $seasonId = $validated['season_id'] ?? null;

        $result = $this->computeForClass($school, $schoolClass, $seasonId, $service);
        if ($result instanceof JsonResponse) {
            return $result;
        }

        $students = Student::query()
            ->whereIn('id', $result['students']->keys())
            ->orderBy('fullname')
            ->get();

        return response()->json([
            'bulletins' => $students
                ->map(fn (Student $student) => $this->studentPayload($school, $schoolClass, $student, $result, $seasonId))
                ->values(),
        ]);
    }

    private function computeForClass(School $school, SchoolClass $schoolClass, ?string $seasonId, BulletinService $service): array|JsonResponse
    {
        $schoolYear = $schoolClass->schoolYear;
        $selectedSeason = $seasonId ? Season::query()->find($seasonId) : null;

        if ($seasonId && (! $selectedSeason || $selectedSeason->school_id !== $school->id || $selectedSeason->school_year_id !== $schoolYear->id)) {
            return response()->json([
                'message' => "La période sélectionnée n'appartient pas à l'année scolaire active de cette école.",
                'code' => 'season_not_available',
            ], 422);
        }

        if (! $selectedSeason && ! $schoolYear->seasons()->exists()) {
            return response()->json([
                'message' => "Aucune période scolaire n'est configurée pour l'année {$schoolYear->label}.",
                'code' => 'seasons_not_configured',
            ], 422);
        }

        return $service->forClass($school, $schoolClass, $selectedSeason);
    }

    /**
     * Réponse d'un bulletin. Les champs historiques (subjects,
     * overall_average, mention…) sont gardés pour les écrans existants.
     */
    private function studentPayload(School $school, SchoolClass $schoolClass, Student $student, array $result, ?string $seasonId): array
    {
        $data = $result['students'][$student->id];

        return [
            'student' => [
                'id' => $student->id,
                'fullname' => $student->fullname,
                'matricule' => $student->matricule,
                'date_of_birth' => $student->date_of_birth?->format('d/m/Y'),
                'gender' => $student->gender,
            ],
            'school' => ['name' => $school->name, 'logo_url' => $school->logo_url],
            'class' => ['name' => $schoolClass->name, 'level' => $schoolClass->level?->name],
            'school_year' => $schoolClass->schoolYear?->label,
            'season_id' => $seasonId,
            'bulletin_type' => $result['bulletin_type'],
            'period_label' => $result['period_label'],
            'subjects' => $data['subjects'],
            'overall_average' => $data['overall_average'],
            'rank' => $data['rank'],
            'class_size' => $result['class_size'],
            'class_average' => $result['class_average'],
            'distinction' => $data['distinction'],
            'decision' => $data['decision'],
            'passed' => $data['passed'],
            // Ancien nom de la décision de fin d'année, gardé pour compatibilité.
            'mention' => $data['decision'],
            'template' => $result['template']->presentation(),
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
        $isAdmin = SchoolUser::query()
            ->where('school_id', $school->id)
            ->where('user_id', $userId)
            ->whereHas('role', fn($query) => $query->where('slug', 'admin'))
            ->exists();

        if ($isAdmin) {
            return;
        }

        $isParent = ParentStudent::query()
            ->where('parent_user_id', $userId)
            ->where('student_id', $student->id)
            ->exists();

        abort_unless($isParent, 403, "Vous n'êtes pas autorisé à consulter ce bulletin.");
    }
}
