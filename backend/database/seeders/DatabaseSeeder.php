<?php

namespace Database\Seeders;

use App\Models\Role;
use App\Models\User;
use Database\Seeders\CountrySeeder;
use Database\Seeders\DemoSchoolSeeder;
use Database\Seeders\LevelSeeder;
use Database\Seeders\RoleSeeder;
use Database\Seeders\SubjectSeeder;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        $this->call(RoleSeeder::class);
        $this->call(CountrySeeder::class);
        $this->call(DemoSchoolSeeder::class);
        $this->call(LevelSeeder::class);
        $this->call(SubjectSeeder::class);

        // User::factory(10)->create();

        User::factory()->create([
            'fullname' => 'Test User',
            'email' => 'test@example.com',
        ]);

        User::factory()->create([
            'fullname' => 'Super Admin',
            'email' => 'superadmin@eduafrique.com',
            'role_id' => Role::query()->where('slug', 'superadmin')->firstOrFail()->id,
        ]);
    }
}
