<?php

namespace App\Http\Controllers\Api\Concerns;

use App\Models\ClassStudent;
use App\Models\ClassSubjectTeacher;
use App\Models\ParentStudent;
use App\Models\School;
use App\Models\SchoolUser;
use App\Models\Student;
use Illuminate\Http\Request;

trait AuthorizesStudentHealth
{
    private const HEALTH_MANAGER_ROLE_SLUGS = ['directeur', 'infirmier'];

    /**
     * L'élève doit être actuellement inscrit (activement) dans cette école :
     * la fiche santé suit l'élève, mais l'accès reste filtré par
     * l'établissement qui le suit en ce moment.
     */
    private function abortUnlessEnrolled(School $school, Student $student): void
    {
        $enrolled = ClassStudent::query()
            ->where('student_id', $student->id)
            ->where('status', ClassStudent::STATUS_ACTIVE)
            ->whereHas('schoolClass', fn ($query) => $query->where('school_id', $school->id))
            ->exists();

        abort_unless($enrolled, 404);
    }

    /**
     * Écriture (profil, allergies, vaccins, visites, traitements, documents) :
     * réservée au directeur et à l'infirmier.
     */
    private function authorizeHealthManager(Request $request, School $school): void
    {
        $this->authorizeRoles(
            $request,
            $school,
            self::HEALTH_MANAGER_ROLE_SLUGS,
            "Vous n'avez pas accès à la gestion de la fiche santé."
        );
    }

    /**
     * Lecture complète du dossier : le staff santé, ou le parent de l'élève
     * consultant la fiche de son propre enfant.
     */
    private function authorizeHealthViewer(Request $request, School $school, Student $student): void
    {
        $userId = $request->user()->id;

        if ($this->isHealthManager($school, $userId) || $this->isParentOf($student, $userId)) {
            return;
        }

        abort(403, "Vous n'avez pas accès à la fiche santé de cet élève.");
    }

    /**
     * Lecture de l'alerte allergie uniquement : en plus du staff santé et
     * du parent, le professeur d'une classe de l'élève peut la voir (elle
     * doit être visible dès qu'il ouvre la fiche), sans accéder au reste
     * du dossier médical.
     */
    private function authorizeAllergyViewer(Request $request, School $school, Student $student): void
    {
        $userId = $request->user()->id;

        if (
            $this->isHealthManager($school, $userId)
            || $this->isParentOf($student, $userId)
            || $this->isTeacherOf($student, $userId)
        ) {
            return;
        }

        abort(403, "Vous n'avez pas accès aux informations santé de cet élève.");
    }

    private function isHealthManager(School $school, string $userId): bool
    {
        return SchoolUser::query()
            ->where('school_id', $school->id)
            ->where('user_id', $userId)
            ->whereHas('role', fn ($query) => $query->whereIn('slug', self::HEALTH_MANAGER_ROLE_SLUGS))
            ->exists();
    }

    private function isParentOf(Student $student, string $userId): bool
    {
        return ParentStudent::query()
            ->where('student_id', $student->id)
            ->where('parent_user_id', $userId)
            ->exists();
    }

    private function isTeacherOf(Student $student, string $userId): bool
    {
        $activeClassIds = ClassStudent::query()
            ->where('student_id', $student->id)
            ->where('status', ClassStudent::STATUS_ACTIVE)
            ->pluck('class_id');

        return ClassSubjectTeacher::query()
            ->where('user_id', $userId)
            ->whereIn('class_id', $activeClassIds)
            ->exists();
    }
}
