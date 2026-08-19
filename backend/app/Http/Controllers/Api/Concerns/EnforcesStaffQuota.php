<?php

namespace App\Http\Controllers\Api\Concerns;

use App\Models\School;
use App\Models\SchoolUser;
use Illuminate\Validation\ValidationException;

trait EnforcesStaffQuota
{
    /**
     * Le palier École limite le nombre de comptes personnel (cf. page
     * tarifs) — parents et élèves n'entrent pas dans ce quota, ce ne sont
     * pas des comptes "personnel".
     */
    private function guardAgainstStaffQuota(School $school): void
    {
        $max = $school->maxStaffAccounts();

        if ($max === null) {
            return;
        }

        $currentCount = SchoolUser::query()
            ->where('school_id', $school->id)
            ->where('status', SchoolUser::STATUS_ACTIVE)
            ->whereHas('role', fn ($query) => $query->whereNotIn('slug', ['parent', 'eleve']))
            ->count();

        if ($currentCount >= $max) {
            throw ValidationException::withMessages([
                'plan' => ["Votre palier École est limité à {$max} comptes personnel. Passez au palier Établissement pour en ajouter davantage."],
            ]);
        }
    }
}
