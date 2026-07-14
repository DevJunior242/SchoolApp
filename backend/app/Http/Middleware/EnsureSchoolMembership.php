<?php

namespace App\Http\Middleware;

use App\Models\School;
use App\Models\SchoolUser;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureSchoolMembership
{
    /**
     * Vérifie que l'utilisateur authentifié appartient bien à l'école visée
     * par la route ({school}) avant de laisser passer la requête — un filet
     * de sécurité centralisé en plus des vérifications de rôle propres à
     * chaque contrôleur.
     */
    public function handle(Request $request, Closure $next): Response
    {
        $school = $request->route('school');

        if (! $school instanceof School) {
            abort(404);
        }

        $isMember = SchoolUser::query()
            ->where('school_id', $school->id)
            ->where('user_id', $request->user()->id)
            ->where('status', SchoolUser::STATUS_ACTIVE)
            ->exists();

        abort_unless($isMember, 403, "Vous n'appartenez pas à cette école.");

        return $next($request);
    }
}
