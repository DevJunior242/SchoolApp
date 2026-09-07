<?php

namespace App\Rules;

use Closure;
use Illuminate\Contracts\Validation\ValidationRule;

class StrongPassword implements ValidationRule
{
    public function validate(string $attribute, mixed $value, Closure $fail): void
    {
        if (! is_string($value) || strlen($value) < 12) {
            $fail('Le mot de passe doit contenir au moins 12 caractères.');

            return;
        }

        if (! preg_match('/[a-z]/', $value)) {
            $fail('Le mot de passe doit contenir une lettre minuscule.');
        }

        if (! preg_match('/[A-Z]/', $value)) {
            $fail('Le mot de passe doit contenir une lettre majuscule.');
        }

        if (! preg_match('/[0-9]/', $value)) {
            $fail('Le mot de passe doit contenir un chiffre.');
        }

        if (! preg_match('/[^A-Za-z0-9]/', $value)) {
            $fail('Le mot de passe doit contenir un caractère spécial.');
        }
    }
}
