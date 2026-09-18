<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Api\Concerns\AuthorizesSchoolDirecteur;
use App\Http\Controllers\Controller;
use App\Models\School;
use App\Models\SchoolStaffAttendance;
use App\Models\SchoolUser;
use App\Services\HrPermissionService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

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
            ->get();

        return response()->json($records);
    }

    public function qr(Request $request, School $school)
    {
        $this->authorizeHrStaff($request, $school);
        $token = Str::random(64);
        $expiresAt = now()->addSeconds(60);
        Cache::put($this->cacheKey($school, $token), true, $expiresAt);

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

    public function punch(Request $request, School $school)
    {
        $validated = $request->validate(['token' => ['required', 'string']]);
        $member = SchoolUser::query()
            ->where('school_id', $school->id)
            ->where('user_id', $request->user()->id)
            ->where('status', SchoolUser::STATUS_ACTIVE)
            ->with('role')
            ->firstOrFail();

        if (in_array($member->role?->slug, ['parent', 'eleve'], true)) {
            abort(403, 'Seul un membre du personnel peut pointer.');
        }

        if (! Cache::has($this->cacheKey($school, $validated['token']))) {
            throw ValidationException::withMessages([
                'token' => ['Ce QR code est expiré ou invalide.'],
            ]);
        }

        $today = now()->toDateString();
        $attendance = SchoolStaffAttendance::query()->firstOrCreate([
            'school_id' => $school->id,
            'user_id' => $member->user_id,
            'attendance_date' => $today,
        ]);

        if (! $attendance->check_in) {
            $attendance->update(['check_in' => now(), 'check_in_source' => 'qr']);
            $message = 'Arrivée enregistrée.';
        } elseif (! $attendance->check_out) {
            $attendance->update(['check_out' => now(), 'check_out_source' => 'qr']);
            $message = 'Départ enregistré.';
        } else {
            throw ValidationException::withMessages([
                'token' => ['Votre arrivée et votre départ sont déjà enregistrés aujourd’hui.'],
            ]);
        }

        return response()->json(['message' => $message, 'attendance' => $attendance->fresh('user')]);
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

    private function cacheKey(School $school, string $token): string
    {
        return "staff-attendance-qr:{$school->id}:{$token}";
    }
}
