<?php

namespace App\Rules;

use Closure;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Http;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Translation\PotentiallyTranslatedString;

 
 
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

        $response = Http::asForm()
            ->timeout(10)
            ->post('https://challenges.cloudflare.com/turnstile/v0/siteverify', [
                'secret' => $secret,
                'response' => $value,
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
