<?php

namespace Tests\Feature;

use App\Models\Country;
use App\Models\Role;
use App\Models\SchoolPricingPlan;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SchoolCreationAccessTest extends TestCase
{
    use RefreshDatabase;

    public function test_superadmin_cannot_create_school(): void
    {
        $superadminRole = Role::query()->firstOrCreate([
            'slug' => 'superadmin',
        ], [
            'name' => 'Super Administrateur',
        ]);

        $user = User::factory()->create([
            'role_id' => $superadminRole->id,
        ]);

        $country = Country::query()->create([
            'name' => 'Côte d\'Ivoire',
            'iso_code' => 'CI',
            'currency' => 'XOF',
        ]);

        $plan = SchoolPricingPlan::query()->create([
            'name' => 'Essai',
            'slug' => 'essai',
            'monthly_amount' => 0,
            'annual_base_amount' => 0,
            'monthly_enabled' => true,
            'annual_enabled' => false,
            'annual_discount_enabled' => false,
            'currency' => 'XOF',
            'max_staff_accounts' => 5,
            'modules' => [],
            'active' => true,
        ]);

        $response = $this->actingAs($user, 'sanctum')
            ->postJson('/api/schools', [
                'name' => 'École interdite',
                'country_id' => $country->id,
                'pricing_plan_id' => $plan->id,
            ]);

        $response->assertForbidden();
        $response->assertJsonPath('message', 'Le superadmin de la plateforme ne peut pas créer une école.');
        $this->assertDatabaseMissing('schools', ['name' => 'École interdite']);
    }
}