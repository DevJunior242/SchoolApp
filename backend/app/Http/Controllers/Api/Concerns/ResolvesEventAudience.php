<?php

namespace App\Http\Controllers\Api\Concerns;

use App\Models\ClassStudent;
use App\Models\ClassSubjectTeacher;
use App\Models\Event;
use App\Models\ParentStudent;
use App\Models\School;
use App\Models\SchoolUser;
use App\Models\Student;

trait ResolvesEventAudience
{
    /**
     * Les utilisateurs concernés par un événement : toute l'école s'il est
     * global, ou seulement les parents/élèves/prof de la classe visée sinon.
     * Partagé entre la création d'événement et la publication de son récap.
     */
    private function eventAudienceUserIds(Event $event, School $school): array
    {
        if ($event->class_id) {
            return $this->classAudienceUserIds($event->class_id);
        }

        return SchoolUser::query()->where('school_id', $school->id)->pluck('user_id')->all();
    }

    private function classAudienceUserIds(string $classId): array
    {
        $activeStudentIds = ClassStudent::query()
            ->where('class_id', $classId)
            ->where('status', ClassStudent::STATUS_ACTIVE)
            ->pluck('student_id');

        $parentIds = ParentStudent::query()
            ->whereIn('student_id', $activeStudentIds)
            ->pluck('parent_user_id');

        $teacherIds = ClassSubjectTeacher::query()->where('class_id', $classId)->pluck('user_id');

        $studentUserIds = Student::query()
            ->whereIn('id', $activeStudentIds)
            ->whereNotNull('user_id')
            ->pluck('user_id');

        return $parentIds->merge($teacherIds)->merge($studentUserIds)->unique()->values()->all();
    }
}
