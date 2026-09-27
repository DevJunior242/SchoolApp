<?php

namespace App\Services\StaffAttendance;

use App\Models\School;
use App\Models\SchoolAttendanceQrToken;
use App\Models\SchoolStaffAttendance;
use App\Models\SchoolStaffAttendanceDevice;
use App\Models\SchoolStaffAttendanceDeviceRequest;
use App\Models\SchoolStaffAttendancePunch;
use App\Models\SchoolStaffAttendanceSetting;
use App\Models\User;
use Illuminate\Http\Exceptions\HttpResponseException;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpFoundation\IpUtils;

/**
 * Pointage du personnel par QR avec contrôles anti-fraude :
 * - réseau du bureau (IP publique du Wi-Fi) → refus si hors réseau ;
 * - téléphone unique par employé → refus si autre téléphone ;
 * - position GPS → pointage accepté mais signalé "suspect" à la RH
 *   (le GPS est parfois imprécis en intérieur et facile à falsifier).
 *
 * Chaque tentative est journalisée, qu'elle soit acceptée ou refusée.
 * En mode secours (Wi-Fi en panne), le réseau n'est plus vérifié mais le
 * pointage est signalé à la RH.
 */
class StaffAttendancePunchService
{
    /** Délai minimum entre arrivée et départ, contre le double scan. */
    private const MIN_MINUTES_BETWEEN_PUNCHES = 5;

    /** Au-delà de cette précision (m), la position GPS n'est pas fiable. */
    private const MAX_GPS_ACCURACY_METERS = 500;

    /** Code renvoyé au téléphone pour proposer une demande de changement. */
    public const CODE_DEVICE_MISMATCH = 'device_mismatch';

    public const FLAG_LABELS = [
        'mode_secours' => 'Pointé en mode secours (Wi-Fi non vérifié)',
        'gps_absent' => 'Position GPS non transmise',
        'gps_hors_zone' => 'Position GPS hors de la zone du bureau',
        'gps_imprecis' => 'Position GPS trop imprécise',
    ];

    /**
     * @param  array{token: string, device_id?: ?string, latitude?: ?float, longitude?: ?float, accuracy?: ?float}  $input
     * @return array{message: string, attendance: SchoolStaffAttendance}
     */
    public function punch(School $school, User $user, array $input, ?string $ip, ?string $userAgent): array
    {
        $settings = SchoolStaffAttendanceSetting::forSchool($school);
        $deviceHash = $this->deviceHash($school, $input['device_id'] ?? null);

        $log = [
            'school_id' => $school->id,
            'user_id' => $user->id,
            'qr_mode' => $settings->qr_mode,
            'ip_address' => $ip,
            'device_hash' => $deviceHash,
            'user_agent' => $userAgent ? mb_substr($userAgent, 0, 255) : null,
            'latitude' => $input['latitude'] ?? null,
            'longitude' => $input['longitude'] ?? null,
            'accuracy_meters' => isset($input['accuracy']) ? (int) round($input['accuracy']) : null,
        ];

        $reject = function (string $reason, ?string $code = null) use ($log) {
            SchoolStaffAttendancePunch::create($log + [
                'result' => SchoolStaffAttendancePunch::RESULT_REJECTED,
                'rejection_reason' => $reason,
            ]);

            // Même format qu'une erreur de validation, plus un code lisible
            // par le téléphone.
            throw new HttpResponseException(response()->json([
                'message' => $reason,
                'errors' => ['token' => [$reason]],
                'code' => $code,
            ], 422));
        };
        $flags = [];

        if (! $this->tokenIsValid($school, $settings, $input['token'])) {
            $reject($settings->isPrinted()
                ? 'Ce QR code n’est plus valable. Scannez le QR affiché à l’administration.'
                : 'Ce QR code est expiré ou invalide.');
        }

        if ($settings->networkCheckEnabled() && $settings->emergencyActive()) {
            $flags[] = 'mode_secours';
        } elseif ($settings->networkCheckEnabled()) {
            $networks = collect($settings->allowed_networks ?? [])->pluck('address')->filter()->values()->all();

            if ($networks === []) {
                $reject('Le réseau du bureau n’a pas encore été enregistré par la RH.');
            }

            if (! $ip || ! IpUtils::checkIp($ip, $networks)) {
                $reject('Vous devez être connecté au Wi-Fi du bureau pour pointer.');
            }
        }

        if ($settings->deviceCheckEnabled()) {
            if (! $deviceHash) {
                $reject('Impossible d’identifier votre téléphone. Rechargez la page puis réessayez.');
            }

            $this->checkDevice($school, $user, $deviceHash, $log['user_agent'], $reject);
        }

        [$gpsFlags, $distance] = $this->gpsFlags($settings, $input);
        $flags = [...$flags, ...$gpsFlags];
        $log['distance_meters'] = $distance;

        $attendance = SchoolStaffAttendance::query()->firstOrCreate([
            'school_id' => $school->id,
            'user_id' => $user->id,
            'attendance_date' => now()->toDateString(),
        ]);

        if (! $attendance->check_in) {
            $attendance->update(['check_in' => now(), 'check_in_source' => 'qr']);
            $result = SchoolStaffAttendancePunch::RESULT_CHECK_IN;
            $message = 'Arrivée enregistrée.';
        } elseif (! $attendance->check_out) {
            if ($attendance->check_in->diffInMinutes(now()) < self::MIN_MINUTES_BETWEEN_PUNCHES) {
                $reject('Votre arrivée a déjà été enregistrée à '.$attendance->check_in->format('H:i').'. Scannez à nouveau à votre départ.');
            }

            $attendance->update(['check_out' => now(), 'check_out_source' => 'qr']);
            $result = SchoolStaffAttendancePunch::RESULT_CHECK_OUT;
            $message = 'Départ enregistré.';
        } else {
            $reject('Votre arrivée et votre départ sont déjà enregistrés aujourd’hui.');
        }

        if ($flags !== []) {
            $attendance->update(['flags' => array_values(array_unique([...($attendance->flags ?? []), ...$flags]))]);
        }

        SchoolStaffAttendancePunch::create($log + [
            'school_staff_attendance_id' => $attendance->id,
            'result' => $result,
            'flags' => $flags ?: null,
        ]);

        return ['message' => $message, 'attendance' => $attendance->fresh('user')];
    }

    /**
     * Demande de l'employé pour pointer désormais avec ce téléphone.
     */
    public function requestDeviceChange(School $school, User $user, string $deviceId, ?string $userAgent): SchoolStaffAttendanceDeviceRequest
    {
        $deviceHash = $this->deviceHash($school, $deviceId);

        $binding = SchoolStaffAttendanceDevice::query()
            ->where('school_id', $school->id)
            ->where('user_id', $user->id)
            ->first();

        if ($binding && hash_equals($binding->device_hash, $deviceHash)) {
            throw ValidationException::withMessages([
                'device_id' => ['Ce téléphone est déjà celui enregistré pour votre compte.'],
            ]);
        }

        $this->ensureDeviceFree($school, $user, $deviceHash);

        return SchoolStaffAttendanceDeviceRequest::query()->updateOrCreate(
            [
                'school_id' => $school->id,
                'user_id' => $user->id,
                'status' => SchoolStaffAttendanceDeviceRequest::STATUS_PENDING,
            ],
            [
                'device_hash' => $deviceHash,
                'user_agent' => $userAgent ? mb_substr($userAgent, 0, 255) : null,
            ],
        );
    }

    public function reviewDeviceRequest(SchoolStaffAttendanceDeviceRequest $request, User $reviewer, bool $approve): void
    {
        if ($request->status !== SchoolStaffAttendanceDeviceRequest::STATUS_PENDING) {
            throw ValidationException::withMessages(['decision' => ['Cette demande a déjà été traitée.']]);
        }

        DB::transaction(function () use ($request, $reviewer, $approve) {
            if ($approve) {
                $this->ensureDeviceFree(School::findOrFail($request->school_id), $request->user, $request->device_hash);

                SchoolStaffAttendanceDevice::query()->updateOrCreate(
                    ['school_id' => $request->school_id, 'user_id' => $request->user_id],
                    [
                        'device_hash' => $request->device_hash,
                        'user_agent' => $request->user_agent,
                        'bound_at' => now(),
                    ],
                );
            }

            $request->update([
                'status' => $approve
                    ? SchoolStaffAttendanceDeviceRequest::STATUS_APPROVED
                    : SchoolStaffAttendanceDeviceRequest::STATUS_REJECTED,
                'reviewed_by' => $reviewer->id,
                'reviewed_at' => now(),
            ]);
        });
    }

    public function deviceHash(School $school, ?string $deviceId): ?string
    {
        return $deviceId ? hash('sha256', $school->id.'|'.$deviceId) : null;
    }

    private function ensureDeviceFree(School $school, User $user, string $deviceHash): void
    {
        $usedByOther = SchoolStaffAttendanceDevice::query()
            ->where('school_id', $school->id)
            ->where('device_hash', $deviceHash)
            ->where('user_id', '!=', $user->id)
            ->exists();

        if ($usedByOther) {
            throw ValidationException::withMessages([
                'device_id' => ['Ce téléphone est déjà utilisé pour pointer par un autre membre du personnel.'],
            ]);
        }
    }

    private function tokenIsValid(School $school, SchoolStaffAttendanceSetting $settings, string $token): bool
    {
        $hash = hash('sha256', $token);

        if ($settings->isPrinted()) {
            return $settings->printed_token_hash !== null && hash_equals($settings->printed_token_hash, $hash);
        }

        return SchoolAttendanceQrToken::query()
            ->where('school_id', $school->id)
            ->where('token_hash', $hash)
            ->where('expires_at', '>', now())
            ->exists();
    }

    private function checkDevice(School $school, User $user, string $deviceHash, ?string $userAgent, callable $reject): void
    {
        $binding = SchoolStaffAttendanceDevice::query()
            ->where('school_id', $school->id)
            ->where('user_id', $user->id)
            ->first();

        if ($binding) {
            if (! hash_equals($binding->device_hash, $deviceHash)) {
                $reject(
                    'Votre compte est lié à un autre téléphone. Si vous avez changé de téléphone, envoyez une demande à la RH.',
                    self::CODE_DEVICE_MISMATCH,
                );
            }

            return;
        }

        // Un téléphone ne peut servir qu'à un seul compte : empêche un
        // collègue présent de pointer pour un absent avec son propre téléphone.
        $usedByOther = SchoolStaffAttendanceDevice::query()
            ->where('school_id', $school->id)
            ->where('device_hash', $deviceHash)
            ->exists();

        if ($usedByOther) {
            $reject('Ce téléphone est déjà utilisé pour pointer par un autre membre du personnel.');
        }

        SchoolStaffAttendanceDevice::create([
            'school_id' => $school->id,
            'user_id' => $user->id,
            'device_hash' => $deviceHash,
            'user_agent' => $userAgent,
            'bound_at' => now(),
        ]);
    }

    /**
     * @return array{0: list<string>, 1: ?int}
     */
    private function gpsFlags(SchoolStaffAttendanceSetting $settings, array $input): array
    {
        if (! $settings->gpsCheckEnabled()) {
            return [[], null];
        }

        if (! isset($input['latitude'], $input['longitude'])) {
            return [['gps_absent'], null];
        }

        $distance = (int) round($this->distanceMeters(
            $settings->latitude,
            $settings->longitude,
            (float) $input['latitude'],
            (float) $input['longitude'],
        ));
        $accuracy = (float) ($input['accuracy'] ?? 0);

        if ($accuracy > self::MAX_GPS_ACCURACY_METERS) {
            return [['gps_imprecis'], $distance];
        }

        // On tolère l'imprécision annoncée par le téléphone.
        return [$distance > $settings->radius_meters + $accuracy ? ['gps_hors_zone'] : [], $distance];
    }

    private function distanceMeters(float $lat1, float $lng1, float $lat2, float $lng2): float
    {
        $earthRadius = 6371000;
        $dLat = deg2rad($lat2 - $lat1);
        $dLng = deg2rad($lng2 - $lng1);
        $a = sin($dLat / 2) ** 2 + cos(deg2rad($lat1)) * cos(deg2rad($lat2)) * sin($dLng / 2) ** 2;

        return $earthRadius * 2 * atan2(sqrt($a), sqrt(1 - $a));
    }
}
