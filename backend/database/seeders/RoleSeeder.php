<?php

namespace Database\Seeders;

use App\Models\Role;
use Illuminate\Database\Seeder;

class RoleSeeder extends Seeder
{
    public function run(): void
    {
      $roles = [
    ['name' => 'Super Administrateur SaaS', 'slug' => 'superadmin'],

    ['name' => 'Fondateur / Promoteur', 'slug' => 'fondateur'],

    ['name' => 'Directeur Général', 'slug' => 'directeur'],

    ['name' => 'Censeur / Proviseur', 'slug' => 'censeur'],

    ['name' => 'Surveillant général', 'slug' => 'surveillant'],

    ['name' => 'Professeur', 'slug' => 'professeur'],

    ['name' => 'Élève', 'slug' => 'eleve'],
    ['name' => 'Parent', 'slug' => 'parent'],

    ['name' => 'Secrétaire', 'slug' => 'secretaire'],

    ['name' => 'Responsable RH', 'slug' => 'rh'],
    ['name' => 'Comptable', 'slug' => 'comptable'],

    ['name' => 'Infirmier', 'slug' => 'infirmier'],
    ['name' => 'Chauffeur', 'slug' => 'chauffeur'],
    ['name' => 'Bibliothécaire', 'slug' => 'bibliothecaire'],
    ['name' => 'Personnel de cantine', 'slug' => 'cantine'],

    ['name' => 'Prestataire', 'slug' => 'prestataire'],
];

        foreach ($roles as $role) {
            Role::query()->firstOrCreate(['slug' => $role['slug']], $role);
        }
    }
}
