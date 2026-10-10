<?php

namespace App\Services;

use App\Models\ClassStudent;
use App\Models\SchoolStudent;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

/**
 * Effectif garçons / filles / total par classe : élèves inscrits dans la
 * classe (class_student actif) et toujours actifs dans l'école. Même calcul
 * pour la page Classes (admin), le tableau de bord du professeur et le
 * rapport pour l'inspection.
 */
class ClassHeadcountService
{
    /**
     * @param  iterable<string>  $classIds
     * @return Collection<string, array{garcons: int, filles: int, total: int}> indexée par class_id
     */
    public function forClasses(string $schoolId, iterable $classIds): Collection
    {
        $classIds = collect($classIds)->filter()->unique()->values();

        if ($classIds->isEmpty()) {
            return collect();
        }

        $rows = DB::table('class_student')
            ->join('students', 'students.id', '=', 'class_student.student_id')
            ->join('school_students', function ($join) use ($schoolId) {
                $join->on('school_students.student_id', '=', 'class_student.student_id')
                    ->where('school_students.school_id', $schoolId)
                    ->where('school_students.status', SchoolStudent::STATUS_ACTIVE);
            })
            ->whereIn('class_student.class_id', $classIds)
            ->where('class_student.status', ClassStudent::STATUS_ACTIVE)
            ->groupBy('class_student.class_id')
            ->selectRaw('class_student.class_id')
            ->selectRaw("SUM(UPPER(LEFT(TRIM(students.gender), 1)) IN ('M', 'G', 'H')) AS garcons")
            ->selectRaw("SUM(UPPER(LEFT(TRIM(students.gender), 1)) = 'F') AS filles")
            ->selectRaw('COUNT(DISTINCT class_student.student_id) AS total')
            ->get()
            ->keyBy('class_id');

        return $classIds->mapWithKeys(fn ($classId) => [$classId => [
            'garcons' => (int) ($rows[$classId]->garcons ?? 0),
            'filles' => (int) ($rows[$classId]->filles ?? 0),
            'total' => (int) ($rows[$classId]->total ?? 0),
        ]]);
    }
}
