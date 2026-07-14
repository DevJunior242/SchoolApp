<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Api\Concerns\AuthorizesSchoolDirecteur;
use App\Http\Controllers\Controller;
use App\Models\School;
use App\Models\SchoolClass;
use App\Models\SchoolUser;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

class ClassController extends Controller
{
    use AuthorizesSchoolDirecteur;

    public function index(Request $request, School $school)
    {
        $this->authorizeMember($request, $school);

        return response()->json(
            SchoolClass::query()
                ->where('school_id', $school->id)
                ->whereHas('schoolYear', fn ($query) => $query->where('is_current', true))
                ->when(
                    $request->query('search'),
                    fn ($query, $search) => $query->where('name', 'like', "%{$search}%")
                )
                ->with(['level', 'classSubjectTeachers.subject', 'classSubjectTeachers.teacher'])
                ->paginate($request->integer('per_page', 10))
        );
    }

    public function store(Request $request, School $school)
    {
        $this->authorizeDirecteur($request, $school);

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'level_id' => ['required', 'uuid', 'exists:levels,id'],
        ]);

        $currentYear = $school->schoolYears()->where('is_current', true)->first();

        if (! $currentYear) {
            throw ValidationException::withMessages([
                'name' => ["Aucune année scolaire active pour cette école."],
            ]);
        }

        $class = SchoolClass::query()->create([
            'school_id' => $school->id,
            'level_id' => $validated['level_id'],
            'school_year_id' => $currentYear->id,
            'name' => $validated['name'],
        ]);

        return response()->json($class->load('level'), 201);
    }

    private function authorizeMember(Request $request, School $school): void
    {
        $belongs = SchoolUser::query()
            ->where('school_id', $school->id)
            ->where('user_id', $request->user()->id)
            ->exists();

        if (! $belongs) {
            abort(403, "Vous n'appartenez pas à cette école.");
        }
    }
}
