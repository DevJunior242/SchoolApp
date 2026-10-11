<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Api\Concerns\AuthorizesSchoolDirecteur;
use App\Http\Controllers\Api\Concerns\ValidatesSchoolSection;
use App\Http\Controllers\Controller;
use App\Models\BulletinAppreciation;
use App\Models\ClassStudent;
use App\Models\ClassSubjectTeacher;
use App\Models\School;
use App\Models\SchoolClass;
use App\Models\SchoolUser;
use App\Models\Season;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/**
 * Appréciations des bulletins :
 * - par matière, écrites par le professeur du cours (ou l'administrateur) ;
 * - générales, écrites par le titulaire de la classe (ou l'administrateur).
 * Une appréciation vide supprime l'existante.
 */
class BulletinAppreciationController extends Controller
{
    use AuthorizesSchoolDirecteur, ValidatesSchoolSection;

    public function subjectIndex(Request $request, ClassSubjectTeacher $assignment)
    {
        $class = $assignment->schoolClass;
        $this->authorizeCourse($request, $assignment);
        $seasonId = $this->validatedSeasonId($request, $class);

        return response()->json($this->rows($class, $assignment->id, $seasonId));
    }

    public function subjectUpdate(Request $request, ClassSubjectTeacher $assignment)
    {
        $class = $assignment->schoolClass;
        $this->authorizeCourse($request, $assignment);
        $seasonId = $this->validatedSeasonId($request, $class);
        $this->save($request, $class, $assignment->id, $seasonId);

        return response()->json($this->rows($class, $assignment->id, $seasonId));
    }

    public function generalIndex(Request $request, School $school, SchoolClass $schoolClass)
    {
        $this->authorizeGeneral($request, $school, $schoolClass);
        $seasonId = $this->validatedSeasonId($request, $schoolClass);

        return response()->json($this->rows($schoolClass, null, $seasonId));
    }

    public function generalUpdate(Request $request, School $school, SchoolClass $schoolClass)
    {
        $this->authorizeGeneral($request, $school, $schoolClass);
        $seasonId = $this->validatedSeasonId($request, $schoolClass);
        $this->save($request, $schoolClass, null, $seasonId);

        return response()->json($this->rows($schoolClass, null, $seasonId));
    }

    /** Classes (année en cours) dont la personne connectée est titulaire. */
    public function myHeadClasses(Request $request, School $school)
    {
        return response()->json(SchoolClass::query()
            ->where('school_id', $school->id)
            ->where('head_teacher_id', $request->user()->id)
            ->whereHas('schoolYear', fn ($query) => $query->where('is_current', true))
            ->with('level')
            ->orderBy('name')
            ->get(['id', 'name', 'level_id']));
    }

    /** Choix du titulaire parmi les professeurs de la classe (administrateur). */
    public function setHeadTeacher(Request $request, School $school, SchoolClass $schoolClass)
    {
        $this->authorizeRoles($request, $school, ['admin'], 'Seul l’administrateur choisit le titulaire.');
        $this->authorizeLevelSection($request, $school, $this->activeSchoolClass($school, $schoolClass));

        $validated = $request->validate(['user_id' => ['nullable', 'uuid']]);
        $userId = $validated['user_id'] ?? null;

        if ($userId) {
            $teachesHere = ClassSubjectTeacher::query()
                ->where('class_id', $schoolClass->id)
                ->where('user_id', $userId)
                ->exists();
            abort_unless($teachesHere, 422, 'Le titulaire doit enseigner dans cette classe.');
        }

        $schoolClass->update(['head_teacher_id' => $userId]);

        return response()->json($schoolClass->fresh('headTeacher:id,fullname'));
    }

    private function authorizeCourse(Request $request, ClassSubjectTeacher $assignment): void
    {
        $class = $assignment->schoolClass;
        $this->authorizeLevelSection($request, $class->school, $this->activeSchoolClass($class->school, $class));

        if ($assignment->user_id !== $request->user()->id && ! $this->isAdmin($request, $class->school_id)) {
            abort(403, 'Seul le professeur de ce cours peut écrire ces appréciations.');
        }
    }

    private function authorizeGeneral(Request $request, School $school, SchoolClass $schoolClass): void
    {
        $this->authorizeLevelSection($request, $school, $this->activeSchoolClass($school, $schoolClass));

        if ($schoolClass->head_teacher_id !== $request->user()->id && ! $this->isAdmin($request, $school->id)) {
            abort(403, 'Seuls le titulaire de la classe et l’administrateur écrivent l’appréciation générale.');
        }
    }

    private function isAdmin(Request $request, string $schoolId): bool
    {
        return SchoolUser::query()
            ->where('school_id', $schoolId)
            ->where('user_id', $request->user()->id)
            ->where('status', SchoolUser::STATUS_ACTIVE)
            ->whereHas('role', fn ($query) => $query->where('slug', 'admin'))
            ->exists();
    }

    /** Période de l'année de la classe, ou null pour le bulletin annuel. */
    private function validatedSeasonId(Request $request, SchoolClass $class): ?string
    {
        $seasonId = $request->validate(['season_id' => ['nullable', 'uuid']])['season_id'] ?? null;

        abort_if(
            $seasonId && ! Season::query()->whereKey($seasonId)->where('school_year_id', $class->school_year_id)->exists(),
            422,
            "La période sélectionnée n'appartient pas à l'année de cette classe."
        );

        return $seasonId;
    }

    /** Élèves actifs de la classe avec leur appréciation. */
    private function rows(SchoolClass $class, ?string $assignmentId, ?string $seasonId): array
    {
        $appreciations = BulletinAppreciation::query()
            ->where('class_id', $class->id)
            ->where('class_subject_teacher_id', $assignmentId)
            ->where('season_id', $seasonId)
            ->get()
            ->keyBy('student_id');

        return ClassStudent::query()
            ->where('class_id', $class->id)
            ->where('status', ClassStudent::STATUS_ACTIVE)
            ->with('student:id,fullname')
            ->get()
            ->sortBy(fn (ClassStudent $enrollment) => $enrollment->student?->fullname)
            ->map(fn (ClassStudent $enrollment) => [
                'student_id' => $enrollment->student_id,
                'fullname' => $enrollment->student?->fullname,
                'content' => $appreciations[$enrollment->student_id]->content ?? '',
            ])
            ->values()
            ->all();
    }

    private function save(Request $request, SchoolClass $class, ?string $assignmentId, ?string $seasonId): void
    {
        $validated = $request->validate([
            'items' => ['required', 'array', 'max:200'],
            'items.*.student_id' => ['required', 'uuid'],
            'items.*.content' => ['nullable', 'string', 'max:500'],
        ]);

        $classStudentIds = ClassStudent::query()
            ->where('class_id', $class->id)
            ->where('status', ClassStudent::STATUS_ACTIVE)
            ->pluck('student_id')
            ->flip();

        DB::transaction(function () use ($validated, $classStudentIds, $class, $assignmentId, $seasonId, $request) {
            foreach ($validated['items'] as $item) {
                abort_unless($classStudentIds->has($item['student_id']), 422, 'Un élève ne fait pas partie de cette classe.');

                $key = [
                    'class_id' => $class->id,
                    'student_id' => $item['student_id'],
                    'class_subject_teacher_id' => $assignmentId,
                    'season_id' => $seasonId,
                ];
                $content = trim((string) ($item['content'] ?? ''));

                // where() explicite : updateOrCreate ne sait pas comparer à NULL.
                $existing = BulletinAppreciation::query()
                    ->where('class_id', $class->id)
                    ->where('student_id', $item['student_id'])
                    ->where('class_subject_teacher_id', $assignmentId)
                    ->where('season_id', $seasonId)
                    ->first();

                if ($content === '') {
                    $existing?->delete();

                    continue;
                }

                if ($existing) {
                    $existing->update(['content' => $content, 'author_id' => $request->user()->id]);
                } else {
                    BulletinAppreciation::query()->create($key + [
                        'school_id' => $class->school_id,
                        'content' => $content,
                        'author_id' => $request->user()->id,
                    ]);
                }
            }
        });
    }
}
