<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Api\Concerns\AuthorizesSchoolDirecteur;
use App\Http\Controllers\Controller;
use App\Models\ClassSubjectTeacher;
use App\Models\School;
use App\Models\SchoolClass;
use App\Models\SchoolUser;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

class ClassTeacherController extends Controller
{
    use AuthorizesSchoolDirecteur;

    public function store(Request $request, School $school, SchoolClass $schoolClass)
    {
        $this->authorizeDirecteur($request, $school);

        $validated = $request->validate([
            'subject_id' => ['required', 'uuid', 'exists:subjects,id'],
            'user_id' => ['required', 'uuid'],
            // Poids de la matière dans la moyenne générale de cette classe
            // (ex: Maths coef 4, Musique coef 1).
            'coefficient' => ['nullable', 'numeric', 'min:0.1', 'max:20'],
        ]);

        $isTeacherInSchool = SchoolUser::query()
            ->where('school_id', $school->id)
            ->where('user_id', $validated['user_id'])
            ->whereHas('role', fn ($query) => $query->where('slug', 'professeur'))
            ->exists();

        if (! $isTeacherInSchool) {
            throw ValidationException::withMessages([
                'user_id' => ["Ce membre n'est pas professeur dans cette école."],
            ]);
        }

        // L'affectation est valable pour toute l'année scolaire, pas pour
        // un seul trimestre/semestre : un prof n'est pas réassigné à chaque
        // période, seules les notes le sont (via leur propre season_id).
        $assignment = ClassSubjectTeacher::query()->updateOrCreate(
            [
                'class_id' => $schoolClass->id,
                'subject_id' => $validated['subject_id'],
                'user_id' => $validated['user_id'],
            ],
            [
                'coefficient' => $validated['coefficient'] ?? 1,
            ]
        );

        return response()->json($assignment->load('subject', 'teacher'), 201);
    }

    public function destroy(Request $request, School $school, SchoolClass $schoolClass, ClassSubjectTeacher $assignment)
    {
        $this->authorizeDirecteur($request, $school);

        abort_if($assignment->class_id !== $schoolClass->id, 404);

        $assignment->delete();

        return response()->json(status: 204);
    }
}
