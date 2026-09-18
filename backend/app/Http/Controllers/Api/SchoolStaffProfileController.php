<?php

namespace App\Http\Controllers\Api;

use App\Models\User;
use App\Models\School;
use App\Models\SchoolUser;
use Illuminate\Http\Request;
use App\Models\SchoolStaffProfile;
use App\Http\Controllers\Controller;
use App\Services\HrPermissionService;
use Illuminate\Validation\ValidationException;
use App\Http\Controllers\Api\Concerns\AuthorizesSchoolDirecteur;

class SchoolStaffProfileController extends Controller
{
    use AuthorizesSchoolDirecteur;

    private const NON_STAFF_ROLE_SLUGS = ['parent', 'eleve'];

    public function index(Request $request, School $school)
    {
        $this->authorizeHrStaff($request, $school);
        $actor = SchoolUser::query()
            ->where('school_id', $school->id)
            ->where('user_id', $request->user()->id)
            ->where('status', SchoolUser::STATUS_ACTIVE)
            ->with(['role', 'sections'])
            ->firstOrFail();
        $hrPermissions = app(HrPermissionService::class);
        $isManagerList = $request->string('role')->value() === 'rh';

        $records = SchoolUser::query()
            ->where('school_id', $school->id)
            ->whereHas('role', fn($query) => $isManagerList
                ? $query->where('slug', 'rh')
                : $query->whereNotIn('slug', [...self::NON_STAFF_ROLE_SLUGS, 'rh']))
            ->when(
                $hrPermissions->isHr($actor) && $actor->sections->isNotEmpty(),
                fn($query) => $query->whereHas('sections', fn($sectionQuery) => $sectionQuery
                    ->whereIn('sections.id', $actor->sections->pluck('id')))
            )
            ->when(
                $request->input('search'),
                fn($query, $search) => $query->whereHas('user', fn($userQuery) => $userQuery
                    ->where('fullname', 'like', "%{$search}%")
                    ->orWhere('email', 'like', "%{$search}%")
                    ->orWhere('phone', 'like', "%{$search}%"))
            )
            ->when(
                $request->input('department'),
                fn($query, $department) => $query->whereHas('staffProfile', fn($profileQuery) => $profileQuery
                    ->where('school_staff_profiles.school_id', $school->id)
                    ->where('department', 'like', "%{$department}%"))
            )
            ->with([
                'user',
                'role',
                'sections',
                'staffProfile' => fn($profileQuery) => $profileQuery->where('school_id', $school->id),
            ])
            ->orderBy('created_at')
            ->paginate($request->integer('per_page', 10))
            ->through(function (SchoolUser $schoolUser) {
                $user = $schoolUser->user;
                $profile = $schoolUser->staffProfile;

                return [
                    'id' => $schoolUser->id,
                    'user_id' => $user?->id,
                    'fullname' => $user?->fullname ?? 'Inconnu',
                    'email' => $user?->email,
                    'phone' => $user?->phone,
                    'role' => $schoolUser->role?->name,
                    'role_slug' => $schoolUser->role?->slug,
                    'is_owner' => $schoolUser->role?->slug === 'rh'
                        && (bool) $schoolUser->is_owner,
                    'sections' => $schoolUser->sections->map(fn($section) => [
                        'id' => $section->id,
                        'name' => $section->name,
                    ])->values(),
                    'department' => $profile?->department,
                    'position' => $profile?->position,
                    'employment_status' => $profile?->employment_status,
                    'hire_date' => $profile?->hire_date,
                    'contract_start_date' => $profile?->contract_start_date,
                    'contract_end_date' => $profile?->contract_end_date,
                    'monthly_salary' => $profile?->monthly_salary,
                    'contract_type' => $profile?->contract_type,
                    'status' => $schoolUser->status,
                    'created_at' => $schoolUser->created_at,
                ];
            });

        return response()->json($records);
    }

    public function store(Request $request, School $school)
    {
        $this->authorizeHrStaff($request, $school);

        $validated = $request->validate([
            'user_id' => ['required', 'uuid', 'exists:users,id'],
            'department' => ['nullable', 'string', 'max:255'],
            'position' => ['nullable', 'string', 'max:255'],
            'employment_status' => ['nullable', 'integer', 'in:1,2,3,4'],
            'hire_date' => ['nullable', 'date'],
            'contract_start_date' => ['nullable', 'date', 'required_if:contract_type,2'],
            'contract_end_date' => ['nullable', 'date', 'after_or_equal:contract_start_date', 'required_if:contract_type,2'],
            'monthly_salary' => ['nullable', 'numeric', 'min:0'],
            'contract_type' => ['nullable', 'integer', 'in:1,2,3,4'],
        ]);

        $schoolUser = SchoolUser::query()
            ->where('school_id', $school->id)
            ->where('user_id', $validated['user_id'])
            ->whereHas('role', fn($query) => $query->whereNotIn('slug', self::NON_STAFF_ROLE_SLUGS))
            ->first();

        if (! $schoolUser) {
            throw ValidationException::withMessages([
                'user_id' => ['Cet utilisateur n\'est pas rattaché à cette école.'],
            ]);
        }

        $payload = collect($validated)->except(['user_id'])->all();
        $payload = array_filter($payload, fn($value) => $value !== null && $value !== '');

        SchoolStaffProfile::query()->updateOrCreate(
            [
                'school_id' => $school->id,
                'user_id' => $validated['user_id'],
            ],
            $payload,
        );

        return response()->json(['message' => 'Profil RH enregistré.'], 201);
    }

    public function show(Request $request, School $school, User $user)
    {
        $this->authorizeHrStaff($request, $school);

        $schoolUser = SchoolUser::query()
            ->where('school_id', $school->id)
            ->where('user_id', $user->id)
            ->with(['user', 'role', 'staffProfile'])
            ->firstOrFail();

        return response()->json([
            'id' => $schoolUser->id,
            'user_id' => $schoolUser->user?->id,
            'fullname' => $schoolUser->user?->fullname,
            'email' => $schoolUser->user?->email,
            'phone' => $schoolUser->user?->phone,
            'role' => $schoolUser->role?->name,
            'role_slug' => $schoolUser->role?->slug,
            'department' => $schoolUser->staffProfile?->department,
            'position' => $schoolUser->staffProfile?->position,
            'employment_status' => $schoolUser->staffProfile?->employment_status,
            'hire_date' => $schoolUser->staffProfile?->hire_date,
            'contract_start_date' => $schoolUser->staffProfile?->contract_start_date,
            'contract_end_date' => $schoolUser->staffProfile?->contract_end_date,
            'monthly_salary' => $schoolUser->staffProfile?->monthly_salary,
            'contract_type' => $schoolUser->staffProfile?->contract_type,
        ]);
    }

    public function update(Request $request, School $school, User $user)
    {
        $this->authorizeHrStaff($request, $school);

        $validated = $request->validate([
            'department' => ['nullable', 'string', 'max:255'],
            'position' => ['nullable', 'string', 'max:255'],
            'employment_status' => ['nullable', 'integer', 'in:1,2,3,4'],
            'hire_date' => ['nullable', 'date'],
            'contract_start_date' => ['nullable', 'date', 'required_if:contract_type,2'],
            'contract_end_date' => ['nullable', 'date', 'after_or_equal:contract_start_date', 'required_if:contract_type,2'],
            'monthly_salary' => ['nullable', 'numeric', 'min:0'],
            'contract_type' => ['nullable', 'integer', 'in:1,2,3,4'],
        ]);

        $schoolUser = SchoolUser::query()
            ->where('school_id', $school->id)
            ->where('user_id', $user->id)
            ->firstOrFail();

        $profile = SchoolStaffProfile::query()->updateOrCreate(
            [
                'school_id' => $school->id,
                'user_id' => $user->id,
            ],
            $validated,
        );

        return response()->json([
            'message' => 'Profil RH mis à jour.',
            'profile' => $profile,
            'school_user' => $schoolUser->load(['user', 'role']),
        ]);
    }

    public function destroy(Request $request, School $school, User $user)
    {
        $this->authorizeHrStaff($request, $school);

        $schoolUser = SchoolUser::query()
            ->where('school_id', $school->id)
            ->where('user_id', $user->id)
            ->firstOrFail();

        SchoolStaffProfile::query()
            ->where('school_id', $school->id)
            ->where('user_id', $user->id)
            ->delete();

        return response()->json([
            'message' => 'Profil RH supprimé.',
            'user_id' => $schoolUser->user_id,
        ]);
    }
}
