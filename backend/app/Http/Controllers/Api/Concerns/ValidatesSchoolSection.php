<?php

namespace App\Http\Controllers\Api\Concerns;

use App\Models\Level;
use App\Models\School;
use App\Models\SchoolClass;
use App\Models\SchoolUser;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

trait ValidatesSchoolSection
{
    /** Retourne le niveau seulement s'il appartient à une section active de l'école. */
    private function activeSchoolLevel(School $school, ?string $levelId): ?Level
    {
        if (! $levelId) {
            return null;
        }

        $level = Level::query()->findOrFail($levelId);

        $isActive = $school->sections()
            ->whereKey($level->section_id)
            ->wherePivot('active', true)
            ->exists();

        if (! $isActive) {
            throw ValidationException::withMessages([
                'level_id' => ["Ce niveau n'appartient pas à une section active de cette école."],
            ]);
        }

        return $level;
    }

    /** La classe est valide uniquement dans son école et pour une section encore ouverte. */
    private function activeSchoolClass(School $school, SchoolClass $schoolClass): Level
    {
        abort_unless($schoolClass->school_id === $school->id, 404);

        return $this->activeSchoolLevel($school, $schoolClass->level_id);
    }

    /** Une affectation de section vide donne un accès global à l'école. */
    private function authorizeLevelSection(Request $request, School $school, Level $level): void
    {
        $member = SchoolUser::query()
            ->where('school_id', $school->id)
            ->where('user_id', $request->user()->id)
            ->where('status', SchoolUser::STATUS_ACTIVE)
            ->with('sections')
            ->firstOrFail();

        if ($member->sections->isNotEmpty()
            && ! $member->sections->pluck('id')->contains($level->section_id)) {
            abort(403, "Vous n'avez pas accès à cette section.");
        }
    }

    /** @return array<int, string>|null Null signifie accès global. */
    private function restrictedSectionIds(Request $request, School $school): ?array
    {
        $member = SchoolUser::query()
            ->where('school_id', $school->id)
            ->where('user_id', $request->user()->id)
            ->where('status', SchoolUser::STATUS_ACTIVE)
            ->with('sections')
            ->firstOrFail();

        return $member->sections->isEmpty() ? null : $member->sections->pluck('id')->all();
    }
}
