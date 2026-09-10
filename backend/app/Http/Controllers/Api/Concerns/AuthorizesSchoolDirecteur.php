<?php

namespace App\Http\Controllers\Api\Concerns;

use App\Models\School;
use App\Models\SchoolUser;
use Illuminate\Http\Request;

trait AuthorizesSchoolDirecteur
{
    private function authorizeDirecteur(Request $request, School $school): void
    {
        $this->authorizeRoles($request, $school, ['fondateur', 'directeur'], "Seuls le fondateur et les directeurs de l'école peuvent gérer les membres.");
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
            ['fondateur', 'directeur', 'secretaire'],
            'Seuls le directeur et le secrétariat peuvent inscrire des élèves.'
        );
    }

    /**
     * Le comptable a aussi besoin de retrouver un élève pour encaisser un
     * paiement en direct, sans pour autant pouvoir inscrire de nouveaux
     * élèves ; l'infirmier a besoin de la liste pour rejoindre la fiche
     * santé d'un élève ; le bibliothécaire en a besoin pour la recherche
     * manuelle (badge oublié) au comptoir de prêt/retour.
     */
    private function authorizeStudentViewer(Request $request, School $school): void
    {
        $this->authorizeRoles(
            $request,
            $school,
            ['directeur', 'secretaire', 'comptable', 'infirmier', 'bibliothecaire','fondateur'],
            "Vous n'avez pas accès à la liste des élèves."
        );
    }

    /**
     * Le suivi des absences (justification, validation) relève aussi du
     * censeur et du surveillant général, pas uniquement du directeur.
     */
    private function authorizeAttendanceValidator(Request $request, School $school): void
    {
        $this->authorizeRoles(
            $request,
            $school,
            ['directeur', 'censeur', 'surveillant','fondateur'],
            "Vous n'avez pas accès à la validation des absences."
        );
    }

    /**
     * La création d'événements (réunions, examens, sorties...) est déléguée
     * au directeur, au censeur et au secrétariat.
     */
    private function authorizeEventManager(Request $request, School $school): void
    {
        $this->authorizeRoles(
            $request,
            $school,
            ['directeur', 'censeur', 'secretaire','fondateur'],
            "Vous n'êtes pas autorisé à gérer les événements de cette école."
        );
    }

    /**
     * La messagerie "contacter l'école" est traitée par le directeur et le
     * secrétariat, qui voient l'ensemble des fils de discussion.
     */
    private function authorizeMessageStaff(Request $request, School $school): void
    {
        $this->authorizeRoles(
            $request,
            $school,
            ['directeur', 'secretaire','fondateur'],
            "Vous n'avez pas accès à la messagerie de l'école."
        );
    }

    /**
     * La gestion de la bibliothèque (catalogue, prêts/retours, documents
     * numériques) est déléguée au bibliothécaire, en plus du directeur.
     */
    private function authorizeLibrarian(Request $request, School $school): void
    {
        $this->authorizeRoles(
            $request,
            $school,
            ['directeur', 'bibliothecaire','fondateur'],
            "Vous n'avez pas accès à la gestion de la bibliothèque."
        );
    }

    /**
     * Déclaration des dépenses : mêmes rôles que la saisie de paiements
     * (directeur, comptable, secrétariat).
     */
    private function authorizeFinanceStaff(Request $request, School $school): void
    {
        $this->authorizeRoles(
            $request,
            $school,
            ['directeur', 'comptable', 'secretaire','fondateur'],
            "Vous n'avez pas accès aux finances de cette école."
        );
    }

    /**
     * Confirmation/rejet des dépenses, gestion des comptes de trésorerie et
     * des mouvements manuels : réservé au directeur et au comptable, comme
     * la confirmation des paiements.
     */
    private function authorizeFinanceManager(Request $request, School $school): void
    {
        $this->authorizeRoles(
            $request,
            $school,
            ['directeur', 'comptable','fondateur'],
            'Seuls le directeur et le comptable peuvent gérer la trésorerie.'
        );
    }

    private function authorizeHrStaff(Request $request, School $school): void
    {
        $this->authorizeRoles(
            $request,
            $school,
            ['directeur', 'rh','fondateur'],
            'Vous n\'avez pas accès à la gestion RH de cette école.'
        );
    }

    private function authorizeRoles(Request $request, School $school, array $slugs, string $message): void
    {
        $authorized = SchoolUser::query()
            ->where('school_id', $school->id)
            ->where('user_id', $request->user()->id)
            ->where('status', SchoolUser::STATUS_ACTIVE)
            ->whereHas('role', fn($query) => $query->whereIn('slug', $slugs))
            ->exists();

        if (! $authorized) {
            abort(403, $message);
        }
    }
}
