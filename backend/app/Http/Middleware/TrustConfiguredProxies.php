<?php

namespace App\Http\Middleware;

use Illuminate\Http\Middleware\TrustProxies;

/**
 * Si l'API passe derrière un proxy (Cloudflare, proxy_pass…), lister ses IP
 * dans TRUSTED_PROXIES : sinon $request->ip() renvoie l'IP du proxy et le
 * contrôle du Wi-Fi du bureau au pointage du personnel ne fonctionne pas.
 */
class TrustConfiguredProxies extends TrustProxies
{
    protected function proxies()
    {
        $configured = config('app.trusted_proxies');

        if (! $configured) {
            return parent::proxies();
        }

        return $configured === '*' ? '*' : array_map('trim', explode(',', $configured));
    }
}
