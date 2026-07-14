<?php

namespace Database\Seeders;

use App\Models\Role;
use Illuminate\Database\Seeder;

class RoleSeeder extends Seeder
{
    public function run(): void
    {
        $roles = [
            ['name' => 'Directeur', 'slug' => 'directeur'],
            ['name' => 'Censeur', 'slug' => 'censeur'],
            ['name' => 'Surveillant général', 'slug' => 'surveillant'],
            ['name' => 'Professeur', 'slug' => 'professeur'],
            ['name' => 'Élève', 'slug' => 'eleve'],
            ['name' => 'Parent', 'slug' => 'parent'],
            ['name' => 'Secrétaire', 'slug' => 'secretaire'],
            ['name' => 'Comptable', 'slug' => 'comptable'],
        ];

        foreach ($roles as $role) {
            Role::query()->firstOrCreate(['slug' => $role['slug']], $role);
        }
    }
}
