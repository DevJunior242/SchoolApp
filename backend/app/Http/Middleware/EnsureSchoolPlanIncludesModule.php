<?php

namespace App\Http\Middleware;

use Closure;
use App\Models\School;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Bloque l'accès à un module réservé aux paliers Établissement/Réseau
 * (IA, bibliothèque, cantine, santé, bus) pour une école au palier École —
 * cf. School::PLAN_RESTRICTED_MODULES et la page tarifs.
 */
class EnsureSchoolPlanIncludesModule
{
    public function handle(Request $request, Closure $next, string $module): Response
    {
        $school = $request->route('school');

        if ($school instanceof School && ! $school->hasModule($module)) {
            return response()->json([
                'message' => "Ce module n'est pas inclus dans votre palier actuel. Passez au palier Établissement pour y accéder.",
                'code' => 'plan_upgrade_required',
            ], 403);
        }

        return $next($request);
    }
}
