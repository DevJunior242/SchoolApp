<?php

namespace App\Http\Middleware;

use App\Models\School;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Bloque les écritures (création/modification/suppression) pour une école
 * passée en lecture seule (essai gratuit expiré, non réactivée par le
 * superadmin) — cf. School::STATUS_READ_ONLY et la commande
 * schools:expire-trials. Les lectures restent autorisées ailleurs, cette
 * middleware n'est appliquée qu'au groupe de routes d'écriture.
 */
class EnsureSchoolIsWritable
{
    public function handle(Request $request, Closure $next): Response
    {
        $school = $request->route('school');

        if ($school instanceof School && $school->isReadOnly()) {
            return response()->json([
                'message' => "Votre période d'essai est terminée. Vos données restent consultables, mais vous ne pouvez plus rien ajouter ni modifier. Contactez-nous pour réactiver l'accès complet.",
                'code' => 'school_read_only',
            ], 403);
        }

        return $next($request);
    }
}
