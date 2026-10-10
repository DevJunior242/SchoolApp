<?php

namespace Tests\Feature;

use App\Models\User;
use App\Notifications\NewLoginNotification;
use App\Notifications\SessionUsedElsewhereNotification;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;
use Laravel\Sanctum\PersonalAccessToken;
use Tests\TestCase;

/**
 * Appareils connectés : liste des sessions, déconnexion d'un appareil,
 * expiration après 30 jours sans activité, alerte « nouvel appareil ».
 */
class SessionsTest extends TestCase
{
    use RefreshDatabase;

    private const ANDROID = 'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 Chrome/128.0 Mobile Safari/537.36';

    private const WINDOWS = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/128.0 Safari/537.36';

    private function login(User $user, string $userAgent, string $clientId): string
    {
        $this->app['auth']->forgetGuards();

        return $this->withHeaders(['User-Agent' => $userAgent, 'X-Client-Id' => $clientId])
            ->postJson('/api/login', ['email' => $user->email, 'password' => 'password'])
            ->assertOk()
            ->json('token');
    }

    private function as(string $token)
    {
        $this->app['auth']->forgetGuards();

        return $this->withHeaders(['Authorization' => 'Bearer '.$token]);
    }

    public function test_user_sees_sessions_and_disconnects_an_unknown_device(): void
    {
        Notification::fake();
        $user = User::factory()->create();

        $phone = $this->login($user, self::ANDROID, 'telephone-0001');
        $pirate = $this->login($user, self::WINDOWS, 'inconnu-00002');

        // Appareil jamais vu sur ce compte : e-mail d'alerte (pas pour le premier).
        Notification::assertSentToTimes($user, NewLoginNotification::class, 1);
        Notification::assertSentTo($user, NewLoginNotification::class, fn ($n) => $n->device === 'Chrome sur Windows');

        $sessions = $this->as($phone)->getJson('/api/me/sessions')->assertOk()->assertJsonCount(2, 'sessions')->json('sessions');
        $current = collect($sessions)->firstWhere('is_current', true);
        $other = collect($sessions)->firstWhere('is_current', false);
        $this->assertSame('Chrome sur Android', $current['device']);
        $this->assertSame('Chrome sur Windows', $other['device']);

        $this->as($phone)->deleteJson('/api/me/sessions/'.$other['id'])->assertOk();
        $this->as($pirate)->getJson('/api/me')->assertUnauthorized();
        $this->as($phone)->getJson('/api/me')->assertOk();

        // Se reconnecter depuis le même téléphone ne renvoie pas d'alerte.
        $this->login($user, self::ANDROID, 'telephone-0001');
        Notification::assertSentToTimes($user, NewLoginNotification::class, 1);
    }

    public function test_logout_others_and_nobody_touches_someone_elses_session(): void
    {
        Notification::fake();
        $user = User::factory()->create();
        $stranger = User::factory()->create();

        $phone = $this->login($user, self::ANDROID, 'telephone-0001');
        $laptop = $this->login($user, self::WINDOWS, 'ordinateur-001');
        $strangerToken = $this->login($stranger, self::WINDOWS, 'autre-000001');
        $strangerSession = PersonalAccessToken::query()->where('tokenable_id', $stranger->id)->value('id');

        $this->as($phone)->deleteJson('/api/me/sessions/'.$strangerSession)->assertNotFound();
        $this->as($strangerToken)->getJson('/api/me')->assertOk();

        $this->as($phone)->postJson('/api/me/sessions/logout-others')->assertOk()->assertJsonPath('count', 1);
        $this->as($laptop)->getJson('/api/me')->assertUnauthorized();
        $this->as($phone)->getJson('/api/me')->assertOk();
    }

    public function test_session_expires_after_thirty_days_without_use(): void
    {
        $user = User::factory()->create();
        $token = $this->login($user, self::ANDROID, 'telephone-0001');

        $this->travel(29)->days();
        $this->as($token)->getJson('/api/me')->assertOk();

        // Utilisée au jour 29 : encore valable 30 jours de plus (expiration glissante).
        $this->travel(29)->days();
        $this->as($token)->getJson('/api/me')->assertOk();

        $this->travel(31)->days();
        $this->as($token)->getJson('/api/me')->assertUnauthorized();

        $this->artisan('auth:prune-sessions')->assertSuccessful();
        $this->assertSame(0, PersonalAccessToken::query()->count());
    }

    public function test_stolen_session_used_from_curl_is_flagged_once(): void
    {
        Notification::fake();
        $user = User::factory()->create();
        $token = $this->login($user, self::ANDROID, 'telephone-0001');

        // Le vrai téléphone : rien à signaler.
        $this->as($token)->withHeaders(['User-Agent' => self::ANDROID])->getJson('/api/me')->assertOk();
        Notification::assertNotSentTo($user, SessionUsedElsewhereNotification::class);

        // Le jeton copié dans curl : signalé, un seul e-mail même si le pirate insiste.
        $this->as($token)->withHeaders(['User-Agent' => 'curl/8.5.0'])->withServerVariables(['REMOTE_ADDR' => '203.0.113.9'])->getJson('/api/me')->assertOk();
        $this->as($token)->withHeaders(['User-Agent' => 'curl/8.5.0'])->getJson('/api/me')->assertOk();
        Notification::assertSentToTimes($user, SessionUsedElsewhereNotification::class, 1);

        $session = $this->as($token)->withHeaders(['User-Agent' => self::ANDROID])->getJson('/api/me/sessions')->json('sessions.0');
        $this->assertTrue($session['suspicious']);
        $this->assertSame('Chrome sur Android', $session['device']);
    }
}
