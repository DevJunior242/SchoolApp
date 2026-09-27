<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Api\Concerns\AuthorizesSchoolDirecteur;
use App\Http\Controllers\Controller;
use App\Models\School;
use App\Models\SchoolAttendanceQrToken;
use App\Models\SchoolStaffAttendance;
use App\Models\SchoolStaffAttendanceDevice;
use App\Models\SchoolStaffAttendanceDeviceRequest;
use App\Models\SchoolStaffAttendancePunch;
use App\Models\SchoolStaffAttendanceSetting;
use App\Models\SchoolUser;
use App\Models\User;
use App\Services\HrPermissionService;
use App\Services\StaffAttendance\StaffAttendancePunchService;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpFoundation\IpUtils;

class SchoolStaffAttendanceController extends Controller
{
    use AuthorizesSchoolDirecteur;

    public function index(Request $request, School $school)
    {
        $this->authorizeHrStaff($request, $school);
        $date = $request->date('date')?->toDateString() ?? now()->toDateString();
        $userIds = $this->visibleUserIds($request, $school);

        $records = SchoolStaffAttendance::query()
            ->where('school_id', $school->id)
            ->whereDate('attendance_date', $date)
            ->whereIn('user_id', $userIds)
            ->with('user:id,fullname,email,phone')
            ->orderBy('check_in')
            ->get()
            ->map(fn (SchoolStaffAttendance $record) => [
                ...$record->toArray(),
                'flag_labels' => collect($record->flags ?? [])
                    ->map(fn ($flag) => StaffAttendancePunchService::FLAG_LABELS[$flag] ?? $flag)
                    ->all(),
            ]);

        return response()->json($records);
    }

    public function qr(Request $request, School $school)
    {
        $this->authorizeHrStaff($request, $school);
        abort_if(
            SchoolStaffAttendanceSetting::forSchool($school)->isPrinted(),
            422,
            'Le pointage est en mode QR imprimé : le QR dynamique est désactivé.'
        );
        $token = Str::random(64);
        // Courte durée : une photo envoyée par WhatsApp arrive souvent trop tard.
        $expiresAt = now()->addSeconds(30);
        SchoolAttendanceQrToken::query()
            ->where('school_id', $school->id)
            ->where('expires_at', '<=', now())
            ->delete();
        SchoolAttendanceQrToken::create([
            'school_id' => $school->id,
            'token_hash' => hash('sha256', $token),
            'expires_at' => $expiresAt,
        ]);

        return response()->json([
            'token' => $token,
            'expires_at' => $expiresAt->toISOString(),
        ]);
    }

    public function myToday(Request $request, School $school)
    {
        $this->authorizeSchoolMember($request, $school);

        $attendance = SchoolStaffAttendance::query()
            ->where('school_id', $school->id)
            ->where('user_id', $request->user()->id)
            ->whereDate('attendance_date', now()->toDateString())
            ->first();

        return response()->json([
            'attendance' => $attendance,
            'status' => $attendance ? (
                $attendance->check_in && $attendance->check_out ? 'completed' : (
                    $attendance->check_in ? 'in_progress' : 'not_started'
                )
            ) : 'not_started',
            // Le téléphone ne demande la position que si l'école l'exige.
            'gps_required' => SchoolStaffAttendanceSetting::forSchool($school)->gpsCheckEnabled(),
            'device_request_pending' => SchoolStaffAttendanceDeviceRequest::query()
                ->where('school_id', $school->id)
                ->where('user_id', $request->user()->id)
                ->where('status', SchoolStaffAttendanceDeviceRequest::STATUS_PENDING)
                ->exists(),
        ]);
    }

    public function myHistory(Request $request, School $school)
    {
        $this->authorizeSchoolMember($request, $school);

        $records = SchoolStaffAttendance::query()
            ->where('school_id', $school->id)
            ->where('user_id', $request->user()->id)
            ->orderByDesc('attendance_date')
            ->limit(30)
            ->get();

        return response()->json($records);
    }

    public function punch(Request $request, School $school, StaffAttendancePunchService $service)
    {
        $validated = $request->validate([
            'token' => ['required', 'string', 'max:255'],
            'device_id' => ['nullable', 'string', 'max:100'],
            'latitude' => ['nullable', 'numeric', 'between:-90,90', 'required_with:longitude'],
            'longitude' => ['nullable', 'numeric', 'between:-180,180', 'required_with:latitude'],
            'accuracy' => ['nullable', 'numeric', 'min:0'],
        ]);
        $this->authorizeStaffMember($request, $school);

        return response()->json($service->punch(
            $school,
            $request->user(),
            $validated,
            $request->ip(),
            $request->userAgent(),
        ));
    }

    public function requestDevice(Request $request, School $school, StaffAttendancePunchService $service)
    {
        $this->authorizeStaffMember($request, $school);
        $validated = $request->validate(['device_id' => ['required', 'string', 'max:100']]);

        $service->requestDeviceChange($school, $request->user(), $validated['device_id'], $request->userAgent());

        return response()->json(['message' => 'Demande envoyée à la RH. Vous pourrez pointer avec ce téléphone dès qu’elle sera acceptée.'], 201);
    }

    public function deviceRequests(Request $request, School $school)
    {
        $this->authorizeHrStaff($request, $school);

        return response()->json(SchoolStaffAttendanceDeviceRequest::query()
            ->where('school_id', $school->id)
            ->where('status', SchoolStaffAttendanceDeviceRequest::STATUS_PENDING)
            ->whereIn('user_id', $this->visibleUserIds($request, $school))
            ->with('user:id,fullname,email,phone')
            ->latest()
            ->get());
    }

    public function reviewDeviceRequest(Request $request, School $school, SchoolStaffAttendanceDeviceRequest $deviceRequest, StaffAttendancePunchService $service)
    {
        $this->authorizeHrStaff($request, $school);
        abort_unless(
            $deviceRequest->school_id === $school->id
                && in_array($deviceRequest->user_id, $this->visibleUserIds($request, $school), true),
            404
        );
        $validated = $request->validate(['decision' => ['required', 'in:approve,reject']]);

        $approve = $validated['decision'] === 'approve';
        $service->reviewDeviceRequest($deviceRequest, $request->user(), $approve);

        return response()->json(['message' => $approve
            ? 'Nouveau téléphone autorisé pour le pointage.'
            : 'Demande refusée.']);
    }

    public function emergency(Request $request, School $school)
    {
        $this->authorizeHrStaff($request, $school);
        $validated = $request->validate(['enabled' => ['required', 'boolean']]);

        $settings = SchoolStaffAttendanceSetting::forSchool($school);
        $settings->fill($validated['enabled']
            ? ['emergency_until' => now()->endOfDay(), 'emergency_enabled_by' => $request->user()->id]
            : ['emergency_until' => null, 'emergency_enabled_by' => null]);
        $settings->save();

        return response()->json($this->settingsPayload($request, $school, $settings));
    }

    public function settings(Request $request, School $school)
    {
        $this->authorizeHrStaff($request, $school);

        return response()->json($this->settingsPayload($request, $school, SchoolStaffAttendanceSetting::forSchool($school)));
    }

    public function updateSettings(Request $request, School $school)
    {
        $this->authorizeHrStaff($request, $school);

        $validated = $request->validate([
            'qr_mode' => ['required', 'in:'.SchoolStaffAttendanceSetting::MODE_ROTATING.','.SchoolStaffAttendanceSetting::MODE_PRINTED],
            'require_network' => ['boolean'],
            'require_device' => ['boolean'],
            'require_gps' => ['boolean'],
            'allowed_networks' => ['nullable', 'array', 'max:10'],
            'allowed_networks.*.address' => ['required', 'string', 'max:64', function ($attribute, $value, $fail) {
                if (! $this->isValidNetwork($value)) {
                    $fail('Adresse réseau invalide : '.$value);
                }
            }],
            'allowed_networks.*.label' => ['nullable', 'string', 'max:100'],
            'latitude' => ['nullable', 'numeric', 'between:-90,90', 'required_if:require_gps,true'],
            'longitude' => ['nullable', 'numeric', 'between:-180,180', 'required_if:require_gps,true'],
            'radius_meters' => ['nullable', 'integer', 'min:20', 'max:5000'],
        ], [
            'latitude.required_if' => 'Enregistrez la position du bureau pour activer le contrôle GPS.',
            'longitude.required_if' => 'Enregistrez la position du bureau pour activer le contrôle GPS.',
        ]);

        $printed = $validated['qr_mode'] === SchoolStaffAttendanceSetting::MODE_PRINTED;

        if (($printed || ($validated['require_network'] ?? false)) && empty($validated['allowed_networks'])) {
            throw ValidationException::withMessages([
                'allowed_networks' => [$printed
                    ? 'Le mode QR imprimé exige d’enregistrer le réseau Wi-Fi du bureau.'
                    : 'Enregistrez au moins un réseau du bureau pour activer ce contrôle.'],
            ]);
        }

        $settings = SchoolStaffAttendanceSetting::forSchool($school);
        $settings->fill([
            'qr_mode' => $validated['qr_mode'],
            'require_network' => $validated['require_network'] ?? false,
            'require_device' => $validated['require_device'] ?? false,
            'require_gps' => $validated['require_gps'] ?? false,
            'allowed_networks' => array_values($validated['allowed_networks'] ?? []),
            'latitude' => $validated['latitude'] ?? null,
            'longitude' => $validated['longitude'] ?? null,
            'radius_meters' => $validated['radius_meters'] ?? 150,
        ]);

        if ($printed && ! $settings->printed_token_hash) {
            $this->assignPrintedToken($settings);
        }

        $settings->save();

        return response()->json($this->settingsPayload($request, $school, $settings));
    }

    public function printedQr(Request $request, School $school)
    {
        $this->authorizeHrStaff($request, $school);
        $settings = SchoolStaffAttendanceSetting::forSchool($school);
        abort_unless($settings->isPrinted() && $settings->printed_token, 404, 'Le mode QR imprimé n’est pas activé.');

        return response()->json([
            'token' => $settings->printed_token,
            'generated_at' => $settings->printed_token_generated_at?->toISOString(),
            'school_name' => $school->name,
        ]);
    }

    public function regeneratePrintedQr(Request $request, School $school)
    {
        $this->authorizeHrStaff($request, $school);
        $settings = SchoolStaffAttendanceSetting::forSchool($school);
        abort_unless($settings->isPrinted(), 422, 'Le mode QR imprimé n’est pas activé.');

        $this->assignPrintedToken($settings);
        $settings->save();

        return $this->printedQr($request, $school);
    }

    public function devices(Request $request, School $school)
    {
        $this->authorizeHrStaff($request, $school);

        return response()->json(SchoolStaffAttendanceDevice::query()
            ->where('school_id', $school->id)
            ->whereIn('user_id', $this->visibleUserIds($request, $school))
            ->with('user:id,fullname,email,phone')
            ->orderByDesc('bound_at')
            ->get());
    }

    public function resetDevice(Request $request, School $school, User $user)
    {
        $this->authorizeHrStaff($request, $school);
        abort_unless(in_array($user->id, $this->visibleUserIds($request, $school), true), 404);

        SchoolStaffAttendanceDevice::query()
            ->where('school_id', $school->id)
            ->where('user_id', $user->id)
            ->delete();

        return response()->json(['message' => 'Téléphone réinitialisé : le prochain téléphone utilisé pour pointer sera enregistré.']);
    }

    public function punches(Request $request, School $school)
    {
        $this->authorizeHrStaff($request, $school);
        $date = $request->date('date')?->toDateString() ?? now()->toDateString();

        return response()->json(SchoolStaffAttendancePunch::query()
            ->where('school_id', $school->id)
            ->whereIn('user_id', $this->visibleUserIds($request, $school))
            ->whereDate('created_at', $date)
            ->with('user:id,fullname')
            ->latest()
            ->limit(200)
            ->get()
            ->map(fn (SchoolStaffAttendancePunch $punch) => [
                ...$punch->toArray(),
                'flag_labels' => collect($punch->flags ?? [])
                    ->map(fn ($flag) => StaffAttendancePunchService::FLAG_LABELS[$flag] ?? $flag)
                    ->all(),
            ]));
    }

    private function authorizeStaffMember(Request $request, School $school): void
    {
        $member = SchoolUser::query()
            ->where('school_id', $school->id)
            ->where('user_id', $request->user()->id)
            ->where('status', SchoolUser::STATUS_ACTIVE)
            ->with('role')
            ->firstOrFail();

        if (in_array($member->role?->slug, ['parent', 'eleve'], true)) {
            abort(403, 'Seul un membre du personnel peut pointer.');
        }
    }

    private function settingsPayload(Request $request, School $school, SchoolStaffAttendanceSetting $settings): array
    {
        return [
            ...$settings->toArray(),
            'school_name' => $school->name,
            'has_printed_token' => (bool) $settings->printed_token_hash,
            'network_check_enabled' => $settings->networkCheckEnabled(),
            'device_check_enabled' => $settings->deviceCheckEnabled(),
            'emergency_active' => $settings->emergencyActive(),
            // Réseau vu par le serveur pour la personne connectée : la RH
            // l'enregistre depuis le Wi-Fi du bureau.
            'current_ip' => $request->ip(),
            'current_network' => $this->networkFor($request->ip()),
        ];
    }

    private function assignPrintedToken(SchoolStaffAttendanceSetting $settings): void
    {
        $token = Str::random(64);
        $settings->printed_token = $token;
        $settings->printed_token_hash = hash('sha256', $token);
        $settings->printed_token_generated_at = now();
    }

    /**
     * En IPv6, l'adresse du téléphone change souvent mais le préfixe /64 du
     * réseau reste le même : on enregistre donc le préfixe.
     */
    private function networkFor(?string $ip): ?string
    {
        if (! $ip || ! filter_var($ip, FILTER_VALIDATE_IP, FILTER_FLAG_IPV6)) {
            return $ip;
        }

        $bytes = substr(inet_pton($ip), 0, 8).str_repeat("\0", 8);

        return inet_ntop($bytes).'/64';
    }

    private function isValidNetwork(string $value): bool
    {
        [$address, $mask] = array_pad(explode('/', $value, 2), 2, null);

        if (! filter_var($address, FILTER_VALIDATE_IP)) {
            return false;
        }

        if ($mask === null) {
            return true;
        }

        $max = filter_var($address, FILTER_VALIDATE_IP, FILTER_FLAG_IPV6) ? 128 : 32;

        return ctype_digit($mask) && (int) $mask >= 8 && (int) $mask <= $max
            && IpUtils::checkIp($address, $value);
    }

    public function correct(Request $request, School $school, SchoolStaffAttendance $attendance)
    {
        $this->authorizeHrStaff($request, $school);
        abort_unless($attendance->school_id === $school->id, 404);

        $validated = $request->validate([
            'check_in' => ['nullable', 'date'],
            'check_out' => ['nullable', 'date', 'after_or_equal:check_in'],
            'reason' => ['required', 'string', 'max:1000'],
        ]);

        $attendance->update([
            'check_in' => $validated['check_in'] ?? null,
            'check_out' => $validated['check_out'] ?? null,
            'check_in_source' => 'correction',
            'check_out_source' => 'correction',
            'correction_reason' => $validated['reason'],
            'corrected_by' => $request->user()->id,
            'corrected_at' => now(),
        ]);

        return response()->json($attendance->fresh(['user', 'correctedBy']));
    }

    private function visibleUserIds(Request $request, School $school): array
    {
        $actor = SchoolUser::query()
            ->where('school_id', $school->id)
            ->where('user_id', $request->user()->id)
            ->where('status', SchoolUser::STATUS_ACTIVE)
            ->with(['role', 'sections'])
            ->firstOrFail();

        $query = SchoolUser::query()
            ->where('school_id', $school->id)
            ->whereNotIn('user_id', [$request->user()->id])
            ->whereHas('role', fn($role) => $role->whereNotIn('slug', ['parent', 'eleve']));

        if (app(HrPermissionService::class)->isOwner($actor) && $actor->sections->isNotEmpty()) {
            $query->whereHas('sections', fn($sections) => $sections
                ->whereIn('sections.id', $actor->sections->pluck('id')));
        }

        return $query->pluck('user_id')->all();
    }
}
