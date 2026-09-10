<?php

namespace App\Http\Controllers\Api;

use App\Models\Level;
use App\Models\School;
use App\Models\SchoolUser;
use App\Models\SchoolClass;
use Illuminate\Http\Request;
use App\Http\Controllers\Controller;
use Illuminate\Validation\ValidationException;
use App\Http\Controllers\Api\Concerns\ValidatesSchoolSection;
use App\Http\Controllers\Api\Concerns\AuthorizesSchoolDirecteur;

class ClassController extends Controller
{
    use AuthorizesSchoolDirecteur, ValidatesSchoolSection;

public function index(Request $request, School $school)
{
    $member = $this->activeMember($request, $school);

    return response()->json(
        SchoolClass::query()
            ->where('classes.school_id', $school->id)
            ->whereHas('schoolYear', fn ($query) => $query->where('is_current', true))
             ->join('levels', 'classes.level_id', '=', 'levels.id')
            ->join('sections', 'levels.section_id', '=', 'sections.id')
            ->join('school_sections', function($join) use ($school) {
                $join->on('sections.id', '=', 'school_sections.section_id')
                    ->where('school_sections.school_id', $school->id)
                    ->where('school_sections.active', true);
            })
            ->when(
                $member->sections->isNotEmpty(),
                fn ($query) => $query->whereIn('sections.id', $member->sections->pluck('id'))
            )
            ->when(
                $request->query('search'),
                fn ($query, $search) => $query->where('classes.name', 'like', "%{$search}%")
            )
            ->select('classes.*') // Important!
            ->with(['level.section', 'classSubjectTeachers.subject', 'classSubjectTeachers.teacher'])
            ->distinct()
            ->paginate($request->integer('per_page', 10))
    );
}
    public function store(Request $request, School $school)
    {
        $this->authorizeDirecteur($request, $school);
        $member = $this->activeMember($request, $school);

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

        $level = $this->activeSchoolLevel($school, $validated['level_id']);

        if (
            $member->role->slug !== 'fondateur'
            && $member->sections->isNotEmpty()
            && ! $member->sections->pluck('id')->contains($level->section_id)
        ) {
            abort(403, "Vous ne pouvez créer des classes que dans vos sections.");
        }

        $alreadyExists = SchoolClass::query()
            ->where('school_id', $school->id)
            ->where('level_id', $level->id)
            ->where('school_year_id', $currentYear->id)
            ->where('name', $validated['name'])
            ->exists();

        if ($alreadyExists) {
            throw ValidationException::withMessages([
                'name' => ['Une classe avec ce nom existe déjà pour ce niveau et cette année scolaire.'],
            ]);
        }

        $class = SchoolClass::query()->create([
            'school_id' => $school->id,
            'level_id' => $level->id,
            'school_year_id' => $currentYear->id,
            'name' => $validated['name'],
        ]);

        return response()->json($class->load('level.section'), 201);
    }

    private function activeMember(Request $request, School $school): SchoolUser
    {
        return SchoolUser::query()
            ->where('school_id', $school->id)
            ->where('user_id', $request->user()->id)
            ->where('status', SchoolUser::STATUS_ACTIVE)
            ->with(['role', 'sections'])
            ->firstOrFail();
    }
}
