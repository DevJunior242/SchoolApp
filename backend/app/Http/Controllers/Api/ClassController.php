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

        $sectionId = $request->query('section_id');

        return response()->json(
            SchoolClass::query()
                ->where('classes.school_id', $school->id)
                ->whereHas('schoolYear', fn($query) => $query->where('is_current', true))
                ->join('levels', 'classes.level_id', '=', 'levels.id')
                ->join('sections', 'levels.section_id', '=', 'sections.id')
                ->join('school_sections', function ($join) use ($school) {
                    $join->on('sections.id', '=', 'school_sections.section_id')
                        ->where('school_sections.school_id', $school->id)
                        ->where('school_sections.active', true);
                })
                //  Filtre par section si fourni
                ->when(
                    $sectionId,
                    fn($query) => $query->where('sections.id', $sectionId)
                )
                // Restriction pour non-fondateurs
                ->when(
                    $member->sections->isNotEmpty(),
                    fn($query) => $query->whereIn('sections.id', $member->sections->pluck('id'))
                )
                ->when(
                    $request->query('search'),
                    fn($query, $search) => $query->where('classes.name', 'like', "%{$search}%")
                )
                ->select('classes.*')
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

    public function update(Request $request, School $school, SchoolClass $class)
    {
        $this->authorizeDirecteur($request, $school);
        $member = $this->activeMember($request, $school);

        if ($class->school_id !== $school->id) {
            return response()->json(['message' => 'Classe non trouvée'], 404);
        }

        if (!$this->canAccessClass($member, $class)) {
            abort(403, "Accès refusé.");
        }

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'level_id' => ['required', 'uuid', 'exists:levels,id'],
        ]);

        $level = $this->activeSchoolLevel($school, $validated['level_id']);

        // Vérifier que le nouveau level est dans une section accessible
        if (
            $member->role->slug !== 'fondateur'
            && $member->sections->isNotEmpty()
            && !$member->sections->pluck('id')->contains($level->section_id)
        ) {
            abort(403, "Vous ne pouvez assigner des classes que dans vos sections.");
        }

        $currentYear = $school->schoolYears()->where('is_current', true)->first();

        // Vérifier l'unicité
        $alreadyExists = SchoolClass::query()
            ->where('school_id', $school->id)
            ->where('level_id', $level->id)
            ->where('school_year_id', $currentYear->id)
            ->where('name', $validated['name'])
            ->where('id', '!=', $class->id)
            ->exists();

        if ($alreadyExists) {
            throw ValidationException::withMessages([
                'name' => ['Une classe avec ce nom existe déjà pour ce niveau et cette année scolaire.'],
            ]);
        }

        $class->update([
            'level_id' => $level->id,
            'name' => $validated['name'],
        ]);

        return response()->json($class->load('level.section'), 200);
    }

    public function destroy(Request $request, School $school, SchoolClass $class)
    {
        $this->authorizeDirecteur($request, $school);
        $member = $this->activeMember($request, $school);

        if ($class->school_id !== $school->id) {
            return response()->json(['message' => 'Classe non trouvée'], 404);
        }

        if (!$this->canAccessClass($member, $class)) {
            abort(403, "Accès refusé.");
        }

        $class->delete();

        return response()->json(['message' => 'Classe supprimée'], 200);
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

    private function canAccessClass(SchoolUser $member, SchoolClass $class): bool
    {
        // Fondateur OU Directeur (DG sans section)
        if (in_array($member->role->slug, ['fondateur', 'directeur'])) {
            // Directeur doit avoir ZÉRO section (c'est un DG)
            if ($member->role->slug === 'directeur' && $member->sections->isNotEmpty()) {
                return false; //  C'est un directeur de section, pas DG
            }
            return true; // Fondateur ou DG
        }

        // Directeur de section - vérifier l'accès
        return $member->sections->pluck('id')->contains($class->level->section_id);
    }
}
