<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * REQUIRE_EMAIL_VERIFICATION : sans vérification exigée, un compte non
 * vérifié accède aux routes "verified" ; avec, il reçoit un 403 en français.
 */
class EmailVerificationToggleTest extends TestCase
{
    use DatabaseTransactions;

    public function test_unverified_user_passes_when_verification_disabled(): void
    {
        config(['auth.require_email_verification' => false]);
        Sanctum::actingAs(User::factory()->unverified()->create());

        // 422 = la requête atteint le contrôleur (validation), pas de blocage e-mail.
        $this->postJson('/api/schools', [])->assertStatus(422);
    }

    public function test_unverified_user_blocked_when_verification_enabled(): void
    {
        config(['auth.require_email_verification' => true]);
        Sanctum::actingAs(User::factory()->unverified()->create());

        $this->postJson('/api/schools', [])
            ->assertStatus(403)
            ->assertJsonPath('message', 'Veuillez vérifier votre adresse e-mail avant de pouvoir effectuer cette action.');
    }
}
