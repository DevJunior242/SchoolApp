<?php

namespace Tests\Feature;

use App\Models\Country;
use App\Models\Role;
use App\Models\School;
use App\Models\SchoolStaffAttendancePunch;
use App\Models\SchoolUser;
use App\Models\User;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * Contrôles anti-fraude du pointage du personnel (Wi-Fi, téléphone, GPS,
 * QR imprimé, mode secours, demandes de changement de téléphone).
 *
 * DatabaseTransactions (et non RefreshDatabase) : la base de test est aussi
 * la base locale, elle ne doit pas être vidée.
 */
class StaffAttendanceSecurityTest extends TestCase
{
    use DatabaseTransactions;

    private const OFFICE_IP = '196.28.245.10';

    private const HOME_IP = '41.202.1.1';

    private School $school;

    private User $hr;

    private User $teacher;

    private User $colleague;

    protected function setUp(): void
    {
        parent::setUp();

        $rhRole = Role::query()->firstOrCreate(['slug' => 'rh'], ['name' => 'Responsable RH']);
        $teacherRole = Role::query()->firstOrCreate(['slug' => 'professeur'], ['name' => 'Professeur']);
        $country = Country::query()->firstOrCreate(['iso_code' => 'BF'], ['name' => 'Burkina Faso', 'currency' => 'XOF']);

        $this->school = School::query()->create([
            'country_id' => $country->id,
            'name' => 'École Pointage Test',
            'status' => School::STATUS_ACTIVE,
            'plan' => School::PLAN_ECOLE,
            'language' => School::LANGUAGE_FR,
            'currency' => 'XOF',
        ]);

        $this->hr = User::factory()->create(['fullname' => 'RH Test']);
        $this->teacher = User::factory()->create(['fullname' => 'Prof Test']);
        $this->colleague = User::factory()->create(['fullname' => 'Collègue Test']);

        foreach ([[$this->hr, $rhRole], [$this->teacher, $teacherRole], [$this->colleague, $teacherRole]] as [$user, $role]) {
            SchoolUser::query()->create([
                'school_id' => $this->school->id,
                'user_id' => $user->id,
                'role_id' => $role->id,
                'status' => SchoolUser::STATUS_ACTIVE,
            ]);
        }
    }

    public function test_rotating_qr_punch_in_then_out_with_double_scan_guard(): void
    {
        $this->punchAs($this->teacher, $this->rotatingToken())->assertOk()->assertJsonPath('message', 'Arrivée enregistrée.');

        $this->punchAs($this->teacher, $this->rotatingToken())->assertStatus(422);

        $this->travel(6)->minutes();
        $this->punchAs($this->teacher, $this->rotatingToken())->assertOk()->assertJsonPath('message', 'Départ enregistré.');
    }

    public function test_network_check_rejects_other_network_and_logs_attempt(): void
    {
        $this->saveSettings(['require_network' => true, 'allowed_networks' => [['address' => self::OFFICE_IP, 'label' => 'Bureau']]]);

        $this->punchAs($this->teacher, $this->rotatingToken(), ip: self::HOME_IP)
            ->assertStatus(422)
            ->assertJsonPath('errors.token.0', 'Vous devez être connecté au Wi-Fi du bureau pour pointer.');

        $this->assertDatabaseHas('school_staff_attendance_punches', [
            'user_id' => $this->teacher->id,
            'result' => SchoolStaffAttendancePunch::RESULT_REJECTED,
            'ip_address' => self::HOME_IP,
        ]);

        $this->punchAs($this->teacher, $this->rotatingToken(), ip: self::OFFICE_IP)->assertOk();
    }

    public function test_device_binding_blocks_other_phone_and_shared_phone(): void
    {
        $this->saveSettings(['require_device' => true]);

        $this->punchAs($this->teacher, $this->rotatingToken(), device: 'phone-teacher')->assertOk();

        // Autre téléphone pour le même compte : refus avec code de demande.
        $this->travel(6)->minutes();
        $this->punchAs($this->teacher, $this->rotatingToken(), device: 'phone-new')
            ->assertStatus(422)
            ->assertJsonPath('code', 'device_mismatch');

        // Le collègue ne peut pas pointer avec le téléphone du professeur.
        $this->punchAs($this->colleague, $this->rotatingToken(), device: 'phone-teacher')
            ->assertStatus(422)
            ->assertJsonPath('errors.token.0', 'Ce téléphone est déjà utilisé pour pointer par un autre membre du personnel.');
    }

    public function test_device_change_request_approved_by_hr(): void
    {
        $this->saveSettings(['require_device' => true]);
        $this->punchAs($this->teacher, $this->rotatingToken(), device: 'phone-old')->assertOk();

        Sanctum::actingAs($this->teacher);
        $this->postJson($this->url('device-requests'), ['device_id' => 'phone-new'])->assertCreated();
        $this->getJson("/api/schools/{$this->school->id}/my-attendance")->assertJsonPath('device_request_pending', true);

        Sanctum::actingAs($this->hr);
        $requestId = $this->getJson($this->url('device-requests'))->assertOk()->json('0.id');
        $this->postJson($this->url("device-requests/{$requestId}/review"), ['decision' => 'approve'])->assertOk();

        $this->travel(6)->minutes();
        $this->punchAs($this->teacher, $this->rotatingToken(), device: 'phone-new')->assertOk()->assertJsonPath('message', 'Départ enregistré.');

        $this->travel(1)->day();
        $this->punchAs($this->teacher, $this->rotatingToken(), device: 'phone-old')->assertStatus(422);
    }

    public function test_emergency_mode_skips_network_but_flags_punch(): void
    {
        $this->saveSettings(['require_network' => true, 'allowed_networks' => [['address' => self::OFFICE_IP]]]);

        Sanctum::actingAs($this->hr);
        $this->postJson($this->url('emergency'), ['enabled' => true])->assertOk()->assertJsonPath('emergency_active', true);

        $this->punchAs($this->teacher, $this->rotatingToken(), ip: self::HOME_IP)
            ->assertOk()
            ->assertJsonPath('attendance.flags', ['mode_secours']);

        // Le mode secours s'arrête tout seul le lendemain.
        $this->travel(1)->day();
        $this->punchAs($this->colleague, $this->rotatingToken(), ip: self::HOME_IP)->assertStatus(422);
    }

    public function test_printed_mode_requires_network_and_disables_rotating_qr(): void
    {
        Sanctum::actingAs($this->hr);
        $this->putJson($this->url('settings'), ['qr_mode' => 'printed'])
            ->assertStatus(422)
            ->assertJsonValidationErrors('allowed_networks');

        $this->saveSettings(['qr_mode' => 'printed', 'allowed_networks' => [['address' => '196.28.245.0/24']]])
            ->assertJsonPath('network_check_enabled', true)
            ->assertJsonPath('device_check_enabled', true);

        Sanctum::actingAs($this->hr);
        $this->postJson($this->url('qr'))->assertStatus(422);
        $printedToken = $this->getJson($this->url('printed-qr'))->assertOk()->json('token');

        $this->punchAs($this->teacher, $printedToken, ip: '196.28.245.77', device: 'phone-teacher')->assertOk();

        // Sans téléphone identifié, le mode imprimé refuse.
        $this->punchAs($this->colleague, $printedToken, ip: '196.28.245.77')->assertStatus(422);

        // Un nouveau QR invalide l'ancien.
        Sanctum::actingAs($this->hr);
        $this->postJson($this->url('printed-qr'))->assertOk();
        $this->punchAs($this->colleague, $printedToken, ip: '196.28.245.77', device: 'phone-colleague')->assertStatus(422);
    }

    public function test_gps_out_of_zone_is_accepted_but_flagged(): void
    {
        $this->saveSettings(['require_gps' => true, 'latitude' => 12.3714, 'longitude' => -1.5197, 'radius_meters' => 100]);

        $this->punchAs($this->teacher, $this->rotatingToken(), gps: ['latitude' => 12.4000, 'longitude' => -1.5197, 'accuracy' => 20])
            ->assertOk()
            ->assertJsonPath('attendance.flags', ['gps_hors_zone']);

        $this->punchAs($this->colleague, $this->rotatingToken(), gps: ['latitude' => 12.3715, 'longitude' => -1.5197, 'accuracy' => 20])
            ->assertOk()
            ->assertJsonPath('attendance.flags', null);

        Sanctum::actingAs($this->hr);
        $this->getJson($this->url(''))
            ->assertOk()
            ->assertJsonFragment(['flag_labels' => ['Position GPS hors de la zone du bureau']]);
    }

    public function test_kiosk_link_shows_qr_without_login_and_can_be_revoked(): void
    {
        Sanctum::actingAs($this->hr);
        $token = $this->postJson($this->url('kiosk'))->assertOk()->assertJsonPath('active', true)->json('token');

        $this->app['auth']->forgetGuards();
        $qr = $this->getJson("/api/kiosk/{$token}")
            ->assertOk()
            ->assertJsonPath('school_name', 'École Pointage Test')
            ->json('token');

        // Le QR du kiosque permet de pointer.
        $this->punchAs($this->teacher, $qr)->assertOk();

        // Un enseignant ne peut pas obtenir le lien.
        Sanctum::actingAs($this->teacher);
        $this->getJson($this->url('kiosk'))->assertForbidden();

        // Un nouveau lien remplace l'ancien.
        Sanctum::actingAs($this->hr);
        $newToken = $this->postJson($this->url('kiosk'))->assertOk()->json('token');
        $this->app['auth']->forgetGuards();
        $this->getJson("/api/kiosk/{$token}")->assertNotFound();
        $this->getJson("/api/kiosk/{$newToken}")->assertOk();

        // Désactivé : plus aucun QR.
        Sanctum::actingAs($this->hr);
        $this->deleteJson($this->url('kiosk'))->assertOk()->assertJsonPath('active', false);
        $this->app['auth']->forgetGuards();
        $this->getJson("/api/kiosk/{$newToken}")->assertNotFound();
        $this->getJson('/api/kiosk/'.str_repeat('a', 48))->assertNotFound();
    }

    private function url(string $path): string
    {
        return rtrim("/api/schools/{$this->school->id}/hr/attendance/{$path}", '/');
    }

    private function rotatingToken(): string
    {
        Sanctum::actingAs($this->hr);

        return $this->postJson($this->url('qr'))->assertOk()->json('token');
    }

    private function saveSettings(array $overrides)
    {
        Sanctum::actingAs($this->hr);

        return $this->putJson($this->url('settings'), $overrides + [
            'qr_mode' => 'rotating',
            'require_network' => false,
            'require_device' => false,
            'require_gps' => false,
            'allowed_networks' => [],
        ])->assertOk();
    }

    private function punchAs(User $user, string $token, string $ip = self::OFFICE_IP, ?string $device = null, array $gps = [])
    {
        Sanctum::actingAs($user);

        return $this->withServerVariables(['REMOTE_ADDR' => $ip])
            ->postJson($this->url('punch'), ['token' => $token, 'device_id' => $device, ...$gps]);
    }
}
