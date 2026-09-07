<?php

namespace Database\Seeders;

use App\Models\Role;
use App\Models\User;
use Illuminate\Database\Seeder;
use Database\Seeders\RoleSeeder;
use Database\Seeders\LevelSeeder;
use Database\Seeders\CountrySeeder;
use Database\Seeders\SubjectSeeder;
// use Database\Seeders\DemoSchoolSeeder;
use Illuminate\Support\Facades\Hash;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;

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
       // $this->call(DemoSchoolSeeder::class);
        $this->call(LevelSeeder::class);
        $this->call(SubjectSeeder::class);

        // User::factory(10)->create();

        // User::factory()->create([
        //     'fullname' => 'Test User',
        //     'email' => 'test@example.com',
        // ]);

        User::factory()->create([
            'fullname' => 'Super Admin',
            'email' => env('SUPERADMIN_EMAIL', 'superadmin@example.com'),
            'phone' => env('SUPERADMIN_PHONE'),
            'password' => Hash::make(env('SUPERADMIN_PASSWORD')),
            'role_id' => Role::query()->where('slug', 'superadmin')->firstOrFail()->id,
            'terms_accepted_version' => config('legal.terms_version'),
            'terms_accepted_at' => now(),
        ]);
    }
}
