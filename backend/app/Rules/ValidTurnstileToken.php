<?php

namespace App\Rules;

use Closure;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Translation\PotentiallyTranslatedString;

/**
 * Vérifie un jeton Cloudflare Turnstile auprès de l'API siteverify.
 *
 * Si TURNSTILE_SECRET_KEY n'est pas renseignée, la vérification est
 * ignorée (pass) plutôt que de bloquer tout le monde — utile en local/
 * staging avant d'avoir de vraies clés Cloudflare. Une fois la clé secrète
 * configurée, un jeton absent ou invalide fait échouer la validation :
 * pas besoin d'un "required" séparé sur le champ, cette règle gère les
 * deux cas elle-même.
 */
class ValidTurnstileToken implements ValidationRule
{
    /**
     * @param  Closure(string, ?string=): PotentiallyTranslatedString  $fail
     */
    public function validate(string $attribute, mixed $value, Closure $fail): void
    {
        $secret = config('services.turnstile.secret');

        if (! $secret) {
            return;
        }

        if (! is_string($value) || $value === '') {
            $fail('Vérification anti-robot manquante. Réessayez.');

            return;
        }

        $response = Http::asForm()->post('https://challenges.cloudflare.com/turnstile/v0/siteverify', [
            'secret' => $secret,
            'response' => $value,
            'remoteip' => request()->ip(),
        ]);

        if ($response->failed() || $response->json('success') !== true) {
            Log::warning('Échec de vérification Turnstile', [
                'errors' => $response->json('error-codes'),
                'ip' => request()->ip(),
            ]);

            $fail('Vérification anti-robot échouée. Réessayez.');
        }
    }
}
