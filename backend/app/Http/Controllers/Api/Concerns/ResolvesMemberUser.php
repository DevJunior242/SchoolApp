<?php

namespace App\Http\Controllers\Api\Concerns;

use App\Models\School;
use App\Models\SchoolUser;
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

    /**
     * L'ajout/invitation d'un membre fait un updateOrCreate sur (school_id,
     * user_id) : si la personne visée a déjà un rôle à cette école, ce rôle
     * serait silencieusement écrasé. Vécu en conditions réelles — un
     * directeur a perdu son rôle en invitant quelqu'un avec sa propre
     * adresse email, son compte est repassé "professeur" sans avertissement
     * et il a perdu l'accès à tout son tableau de bord. On bloque
     * spécifiquement l'écrasement du rôle directeur, qui est unique et
     * désigné à la création de l'école.
     */
    private function guardAgainstOverwritingDirecteur(School $school, User $user): void
    {
        $isDirecteur = SchoolUser::query()
            ->where('school_id', $school->id)
            ->where('user_id', $user->id)
            ->whereHas('role', fn ($query) => $query->where('slug', 'directeur'))
            ->exists();

        abort_if($isDirecteur, 422, "Ce compte est déjà directeur de cette école : son rôle ne peut pas être changé via cet écran.");
    }
}
