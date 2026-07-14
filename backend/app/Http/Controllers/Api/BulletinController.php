<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Api\Concerns\AuthorizesSchoolDirecteur;
use App\Http\Controllers\Controller;
use App\Models\ClassStudent;
use App\Models\ClassSubjectTeacher;
use App\Models\School;
use App\Models\Student;
use Illuminate\Http\Request;

class BulletinController extends Controller
{
    use AuthorizesSchoolDirecteur;

    public function show(Request $request, School $school, Student $student)
    {
        $this->authorizeDirecteur($request, $school);

        $classStudent = ClassStudent::query()
            ->where('student_id', $student->id)
            ->where('status', ClassStudent::STATUS_ACTIVE)
            ->whereHas('schoolClass', fn ($query) => $query->where('school_id', $school->id))
            ->latest('created_at')
            ->first();

        if (! $classStudent) {
            return response()->json(['message' => "Cet élève n'est inscrit dans aucune classe active."], 404);
        }

        $assignments = ClassSubjectTeacher::query()
            ->where('class_id', $classStudent->class_id)
            ->where('season_id', $classStudent->season_id)
            ->with(['subject', 'teacher', 'grades' => fn ($query) => $query->where('student_id', $student->id)])
            ->get();

        $subjects = $assignments->map(function (ClassSubjectTeacher $assignment) {
            $grades = $assignment->grades;
            $totalWeight = $grades->sum('coefficient');
            $average = $totalWeight > 0
                ? round($grades->sum(fn ($g) => ($g->score / $g->max_score) * 20 * $g->coefficient) / $totalWeight, 2)
                : null;

            return [
                'subject' => $assignment->subject->name,
                'teacher' => $assignment->teacher->fullname,
                'grades_count' => $grades->count(),
                'average' => $average,
            ];
        });

        $withAverage = $subjects->filter(fn ($s) => $s['average'] !== null);
        $overallAverage = $withAverage->isNotEmpty()
            ? round($withAverage->avg('average'), 2)
            : null;

        return response()->json([
            'student' => ['id' => $student->id, 'fullname' => $student->fullname],
            'subjects' => $subjects->values(),
            'overall_average' => $overallAverage,
        ]);
    }
}
