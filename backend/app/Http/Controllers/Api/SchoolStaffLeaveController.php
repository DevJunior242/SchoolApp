<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Api\Concerns\AuthorizesSchoolDirecteur;
use App\Http\Controllers\Controller;
use App\Models\School;
use App\Models\SchoolStaffLeave;
use App\Models\SchoolUser;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class SchoolStaffLeaveController extends Controller
{
    use AuthorizesSchoolDirecteur;

    public function index(Request $request, School $school)
    {
        $this->authorizeHrStaff($request, $school);

        $leaves = SchoolStaffLeave::query()
            ->where('school_id', $school->id)
            ->when($request->filled('status'), fn ($query) => $query->where('status', $request->integer('status')))
            ->with(['user:id,fullname,email', 'approver:id,fullname'])
            ->orderByDesc('starts_on')
            ->get()
            ->map(fn (SchoolStaffLeave $leave) => $this->formatLeave($leave));

        return response()->json($leaves);
    }

    public function store(Request $request, School $school)
    {
        $this->authorizeHrStaff($request, $school);

        $validated = $request->validate([
            'user_id' => ['required', 'uuid', 'exists:users,id'],
            'leave_type' => ['required', 'string', 'max:100'],
            'starts_on' => ['required', 'date'],
            'ends_on' => ['required', 'date', 'after_or_equal:starts_on'],
            'reason' => ['nullable', 'string', 'max:2000'],
        ]);

        $isStaffMember = SchoolUser::query()
            ->where('school_id', $school->id)
            ->where('user_id', $validated['user_id'])
            ->whereHas('staffProfile', fn ($query) => $query->where('school_staff_profiles.school_id', $school->id))
            ->exists();

        if (! $isStaffMember) {
            throw ValidationException::withMessages([
                'user_id' => ['Ce membre ne possède pas de profil RH dans cette école.'],
            ]);
        }

        $leave = SchoolStaffLeave::query()->create([
            ...$validated,
            'school_id' => $school->id,
            'status' => SchoolStaffLeave::STATUS_PENDING,
        ]);

        return response()->json($this->formatLeave($leave->load('user')), 201);
    }

    public function updateStatus(Request $request, School $school, SchoolStaffLeave $leave)
    {
        $this->authorizeHrStaff($request, $school);
        abort_unless($leave->school_id === $school->id, 404);

        $validated = $request->validate([
            'status' => ['required', 'integer', Rule::in([
                SchoolStaffLeave::STATUS_APPROVED,
                SchoolStaffLeave::STATUS_REJECTED,
            ])],
        ]);

        $leave->update([
            'status' => $validated['status'],
            'approved_by' => $request->user()->id,
            'approved_at' => now(),
        ]);

        return response()->json($this->formatLeave($leave->fresh(['user', 'approver'])));
    }

    private function formatLeave(SchoolStaffLeave $leave): array
    {
        return [
            'id' => $leave->id,
            'user_id' => $leave->user_id,
            'fullname' => $leave->user?->fullname ?? 'Inconnu',
            'email' => $leave->user?->email,
            'leave_type' => $leave->leave_type,
            'leave_type_label' => SchoolStaffLeave::leaveTypeLabel($leave->leave_type),
            'status' => $leave->status,
            'status_label' => SchoolStaffLeave::statusLabel($leave->status),
            'starts_on' => $leave->starts_on?->format('Y-m-d'),
            'ends_on' => $leave->ends_on?->format('Y-m-d'),
            'reason' => $leave->reason,
            'approved_by' => $leave->approver?->fullname,
            'approved_at' => $leave->approved_at?->toISOString(),
        ];
    }
}
