<?php

namespace Database\Seeders;

use App\Models\Role;
use App\Models\User;
use Illuminate\Database\Seeder;
use Database\Seeders\RoleSeeder;
use Database\Seeders\CountrySeeder;
use Database\Seeders\SubjectSeeder;
use Illuminate\Support\Facades\Hash;
use Database\Seeders\SectionAndLevelSeeder;
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
 $this->call(
        SectionAndLevelSeeder::class
    );        $this->call(SubjectSeeder::class);
      
        

        User::firstOrCreate(
            ['email' => env('SUPERADMIN_EMAIL','admin@example.com')],
            [
                'fullname' => 'Super Admin',
                'phone' => env('SUPERADMIN_PHONE', '+33123456789'),
                'password' => Hash::make(env('SUPERADMIN_PASSWORD', 'password')),
                'role_id' => Role::query()->where('slug', 'superadmin')->firstOrFail()->id,
                'email_verified_at' => now(),
                'terms_accepted_version' => config('legal.terms_version'),
                'terms_accepted_at' => now(),
            ]
        );
    }
}
