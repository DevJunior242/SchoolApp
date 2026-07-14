<?php

namespace App\Http\Controllers\Api\Concerns;

use App\Models\School;
use App\Models\SchoolUser;
use Illuminate\Http\Request;

trait AuthorizesSchoolDirecteur
{
    private function authorizeDirecteur(Request $request, School $school): void
    {
        $this->authorizeRoles($request, $school, ['directeur'], "Seul le directeur de l'école peut gérer les membres.");
    }

    /**
     * L'inscription des élèves est aussi déléguée au secrétariat, pas
     * uniquement au directeur.
     */
    private function authorizeStudentRegistrar(Request $request, School $school): void
    {
        $this->authorizeRoles(
            $request,
            $school,
            ['directeur', 'secretaire'],
            "Seuls le directeur et le secrétariat peuvent inscrire des élèves."
        );
    }

    /**
     * Le comptable a aussi besoin de retrouver un élève pour encaisser un
     * paiement en direct, sans pour autant pouvoir inscrire de nouveaux élèves.
     */
    private function authorizeStudentViewer(Request $request, School $school): void
    {
        $this->authorizeRoles(
            $request,
            $school,
            ['directeur', 'secretaire', 'comptable'],
            "Vous n'avez pas accès à la liste des élèves."
        );
    }

    private function authorizeRoles(Request $request, School $school, array $slugs, string $message): void
    {
        $authorized = SchoolUser::query()
            ->where('school_id', $school->id)
            ->where('user_id', $request->user()->id)
            ->whereHas('role', fn ($query) => $query->whereIn('slug', $slugs))
            ->exists();

        if (! $authorized) {
            abort(403, $message);
        }
    }
}
