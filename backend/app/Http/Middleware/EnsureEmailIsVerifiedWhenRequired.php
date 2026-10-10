<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Auth\Middleware\EnsureEmailIsVerified;
use Illuminate\Http\Request;

/**
 * Remplace le middleware "verified" de Laravel : la vérification de l'e-mail
 * n'est exigée que si REQUIRE_EMAIL_VERIFICATION=true (désactivée pendant la
 * phase de test, à réactiver pour le lancement).
 */
class EnsureEmailIsVerifiedWhenRequired extends EnsureEmailIsVerified
{
    public function handle($request, Closure $next, $redirectToRoute = null)
    {
        if (! config('auth.require_email_verification')) {
            return $next($request);
        }

        return parent::handle($request, $next, $redirectToRoute);
    }
}
