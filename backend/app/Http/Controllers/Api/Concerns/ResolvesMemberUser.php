<?php

namespace App\Http\Controllers\Api\Concerns;

use App\Models\User;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

trait ResolvesMemberUser
{
    /**
     * Trouve un utilisateur existant par email ou téléphone, sinon en crée un.
     */
    private function resolveUser(array $validated): User
    {
        $user = User::query()
            ->where(function ($query) use ($validated) {
                if (! empty($validated['email'])) {
                    $query->orWhere('email', $validated['email']);
                }
                if (! empty($validated['phone'])) {
                    $query->orWhere('phone', $validated['phone']);
                }
            })
            ->first();

        if ($user) {
            return $user;
        }

        if (empty($validated['email']) || empty($validated['fullname'])) {
            throw ValidationException::withMessages([
                'email' => ["Aucun membre existant avec ces informations. Le nom complet et l'email sont requis pour créer un nouveau membre."],
            ]);
        }

        return User::create([
            'fullname' => $validated['fullname'],
            'email' => $validated['email'],
            'phone' => $validated['phone'] ?? null,
            'password' => Hash::make(str()->random(24)),
        ]);
    }
}
