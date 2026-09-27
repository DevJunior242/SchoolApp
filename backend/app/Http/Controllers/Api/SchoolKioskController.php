<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Api\Concerns\AuthorizesSchoolDirecteur;
use App\Http\Controllers\Controller;
use App\Models\School;
use App\Models\SchoolStaffAttendanceSetting;
use App\Services\StaffAttendance\StaffAttendancePunchService;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

/**
 * Page « QR seul » pour l'appareil de l'accueil (repris d'Intellino RH) :
 * elle s'ouvre avec un lien secret, sans aucun compte connecté. Si l'appareil
 * est volé ou quitte la page, personne n'accède aux données de l'école. Le
 * lien ne donne que le QR : les contrôles Wi-Fi / téléphone s'appliquent
 * toujours au pointage.
 */
class SchoolKioskController extends Controller
{
    use AuthorizesSchoolDirecteur;

    public function show(Request $request, School $school)
    {
        $this->authorizeHrStaff($request, $school);

        return response()->json($this->payload(SchoolStaffAttendanceSetting::forSchool($school)));
    }

    /**
     * Crée (ou remplace) le lien : l'ancien cesse de fonctionner aussitôt.
     */
    public function regenerate(Request $request, School $school)
    {
        $this->authorizeHrStaff($request, $school);
        $settings = SchoolStaffAttendanceSetting::forSchool($school);
        $token = Str::random(48);

        $settings->fill([
            'kiosk_token' => $token,
            'kiosk_token_hash' => hash('sha256', $token),
            'kiosk_token_generated_at' => now(),
        ])->save();

        return response()->json($this->payload($settings));
    }

    public function revoke(Request $request, School $school)
    {
        $this->authorizeHrStaff($request, $school);
        $settings = SchoolStaffAttendanceSetting::forSchool($school);

        if ($settings->exists) {
            $settings->fill(['kiosk_token' => null, 'kiosk_token_hash' => null, 'kiosk_token_generated_at' => null])->save();
        }

        return response()->json($this->payload($settings));
    }

    /**
     * Route publique appelée par la page kiosque toutes les ~25 s.
     */
    public function qr(string $token, StaffAttendancePunchService $service)
    {
        $settings = SchoolStaffAttendanceSetting::query()
            ->where('kiosk_token_hash', hash('sha256', $token))
            ->first();

        abort_unless($settings, 404, 'Ce lien d’affichage n’est plus valable. Demandez un nouveau lien à la RH.');
        abort_if($settings->isPrinted(), 422, 'Le pointage est en mode QR imprimé : l’écran d’accueil n’est pas utilisé.');

        $school = School::query()->findOrFail($settings->school_id);

        return response()->json([
            ...$service->issueRotatingToken($school),
            'school_name' => $school->name,
            'server_time' => now()->toISOString(),
        ]);
    }

    private function payload(SchoolStaffAttendanceSetting $settings): array
    {
        return [
            'active' => (bool) $settings->kiosk_token_hash,
            'token' => $settings->kiosk_token,
            'generated_at' => $settings->kiosk_token_generated_at?->toISOString(),
            'qr_mode' => $settings->qr_mode,
        ];
    }
}
