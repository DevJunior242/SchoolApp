<?php

namespace App\Http\Middleware;

use Closure;
use App\Models\School;
use App\Models\Section;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureUserHasSectionAccess
{
    /**
     * Vérifie si l'utilisateur a le droit d'accéder aux ressources de la section ciblée.
     */
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if (! $user) {
            abort(401, 'Non authentifié.');
        }

        // 1. Identification de l'école (depuis la route {school} ou le profil utilisateur)
        $schoolParam = $request->route('school');
        $schoolId = $schoolParam instanceof School ? $schoolParam->id : ($schoolParam ?? $user->current_school_id);

        if (! $schoolId) {
            return $next($request);
        }

        // 2. Récupération de la relation membre (SchoolUser) avec ses sections restreintes
        $schoolUser = $user->schoolUsers()
            ->where('school_id', $schoolId)
            ->with('sections')
            ->first();

        if (! $schoolUser) {
            abort(403, "Vous ne faites pas partie de cet établissement.");
        }

        // Si l'utilisateur n'a aucune restriction (ex: Directeur Général / Fondateur), il a un accès global
        if ($schoolUser->sections->isEmpty()) {
            return $next($request);
        }

        // 3. Identification de la section ciblée par la requête
        $targetSectionId = $this->resolveSectionId($request);

        // Si la route ne cible pas de section particulière, on autorise la requête
        if (! $targetSectionId) {
            return $next($request);
        }

        // 4. Contrôle d'accès : la section demandée doit faire partie de ses autorisations
        $allowedSectionIds = $schoolUser->sections->pluck('id')->toArray();

        if (! in_array($targetSectionId, $allowedSectionIds, true)) {
            abort(403, "Accès refusé : vous n'avez pas les droits d'accès pour cette section.");
        }

        return $next($request);
    }

    /**
     * Extrait l'ID de la section depuis la route ({section}) ou le corps/paramètres de la requête (section_id).
     */
    private function resolveSectionId(Request $request): ?string
    {
        // Parameter {section} dans la route (ex: /schools/{school}/sections/{section}/classes)
        $sectionParam = $request->route('section');
        if ($sectionParam) {
            return $sectionParam instanceof Section ? $sectionParam->id : $sectionParam;
        }

        // Champ section_id dans le payload (ex: création d'une classe ou filtrage)
        return $request->input('section_id');
    }
}