<?php

namespace Tests\Feature;

use App\Models\Country;
use App\Models\Role;
use App\Models\School;
use App\Models\SchoolUser;
use App\Models\User;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * Le fondateur (créateur de l'école) n'est pas salarié par défaut : pas de
 * pointage tant qu'il n'a pas activé « Je travaille aussi comme salarié ».
 */
class SchoolOwnerStaffStatusTest extends TestCase
{
    use DatabaseTransactions;

    private School $school;

    private User $owner;

    private User $otherAdmin;

    protected function setUp(): void
    {
        parent::setUp();

        $adminRole = Role::query()->firstOrCreate(['slug' => 'admin'], ['name' => 'Administrateur de l’école']);
        $country = Country::query()->firstOrCreate(['iso_code' => 'BF'], ['name' => 'Burkina Faso', 'currency' => 'XOF']);

        $this->school = School::query()->create([
            'country_id' => $country->id,
            'name' => 'École Fondateur Test',
            'status' => School::STATUS_ACTIVE,
            'plan' => School::PLAN_ECOLE,
            'language' => School::LANGUAGE_FR,
            'currency' => 'XOF',
        ]);

        $this->owner = User::factory()->create();
        $this->otherAdmin = User::factory()->create();

        SchoolUser::query()->create([
            'school_id' => $this->school->id,
            'user_id' => $this->owner->id,
            'role_id' => $adminRole->id,
            'status' => SchoolUser::STATUS_ACTIVE,
            'is_owner' => true,
            'is_staff' => false,
        ]);
        SchoolUser::query()->create([
            'school_id' => $this->school->id,
            'user_id' => $this->otherAdmin->id,
            'role_id' => $adminRole->id,
            'status' => SchoolUser::STATUS_ACTIVE,
        ]);
    }

    public function test_other_members_are_staff_by_default(): void
    {
        Sanctum::actingAs($this->otherAdmin);

        $this->getJson('/api/my-schools')->assertOk()->assertJsonPath('0.is_staff', true);
    }

    public function test_owner_cannot_punch_until_marked_as_staff(): void
    {
        Sanctum::actingAs($this->owner);
        $punchUrl = "/api/schools/{$this->school->id}/hr/attendance/punch";

        $this->postJson($punchUrl, ['token' => 'x'])
            ->assertForbidden()
            ->assertJsonPath('message', 'Vous n’êtes pas enregistré comme salarié de l’école. Activez « Je travaille aussi comme salarié de l’école » dans votre profil pour pointer.');

        $this->putJson("/api/schools/{$this->school->id}/my-staff-status", ['is_staff' => true])
            ->assertOk()
            ->assertJsonPath('is_staff', true);

        // Salarié : il passe le contrôle et tombe sur la vérification du QR.
        $this->postJson($punchUrl, ['token' => 'x'])
            ->assertStatus(422)
            ->assertJsonPath('errors.token.0', 'Ce QR code est expiré ou invalide.');
    }

    public function test_only_the_school_creator_can_change_the_setting(): void
    {
        Sanctum::actingAs($this->otherAdmin);

        $this->putJson("/api/schools/{$this->school->id}/my-staff-status", ['is_staff' => false])
            ->assertForbidden();
    }
}
