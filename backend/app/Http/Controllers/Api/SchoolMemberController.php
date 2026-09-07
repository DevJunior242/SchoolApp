<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Api\Concerns\AuthorizesSchoolDirecteur;
use App\Http\Controllers\Api\Concerns\EnforcesStaffQuota;
use App\Http\Controllers\Api\Concerns\ResolvesMemberUser;
use App\Http\Controllers\Controller;
use App\Models\Role;
use App\Models\School;
use App\Models\SchoolUser;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

class SchoolMemberController extends Controller
{
    use AuthorizesSchoolDirecteur, EnforcesStaffQuota, ResolvesMemberUser;

    /**
     * Rôles non attribuables via l'ajout de membre générique : le directeur est
     * unique (désigné à la création de l'école), parent/élève arrivent via
     * l'inscription des élèves (pivot class_user), et professeur a sa propre
     * page/flux dédié (Professeurs).
     */
    private const RESTRICTED_ROLE_SLUGS = ['directeur', 'parent', 'eleve', 'professeur', 'infirmier'];

    /**
     * Parent, élève et professeur disposent de leurs propres écrans métier et
     * ne doivent pas être dupliqués dans la liste générique des membres.
     */
    private const HIDDEN_FROM_LIST_ROLE_SLUGS = ['parent', 'eleve', 'professeur'];

    public function index(Request $request, School $school)
    {
        $this->authorizeDirecteur($request, $school);

        return response()->json(
            SchoolUser::query()
                ->where('school_id', $school->id)
                ->whereHas('role', fn ($query) => $query->whereNotIn('slug', self::HIDDEN_FROM_LIST_ROLE_SLUGS))
                ->when(
                    $request->query('search'),
                    fn ($query, $search) => $query->whereHas('user', fn ($q) => $q->where('fullname', 'like', "%{$search}%"))
                )
                ->with(['user', 'role'])
                ->paginate($request->integer('per_page', 10))
        );
    }

    public function store(Request $request, School $school)
    {
        $this->authorizeDirecteur($request, $school);

        $validated = $request->validate([
            'fullname' => ['nullable', 'string', 'max:255'],
            'email' => ['nullable', 'required_without:phone', 'email'],
            'phone' => ['nullable', 'required_without:email', 'string', 'max:30'],
            'role_id' => ['required', 'uuid', 'exists:roles,id'],
        ]);

        $role = Role::findOrFail($validated['role_id']);

        if (in_array($role->slug, self::RESTRICTED_ROLE_SLUGS, true)) {
            throw ValidationException::withMessages([
                'role_id' => ["Ce rôle ne peut pas être attribué via l'ajout de membre."],
            ]);
        }

        $user = $this->resolveUser($validated);
        $this->guardAgainstRoleConflict($school, $user, $validated['role_id']);

        $schoolUser = SchoolUser::query()->updateOrCreate(
            [
                'school_id' => $school->id,
                'user_id' => $user->id,
            ],
            [
                'role_id' => $validated['role_id'],
                'status' => SchoolUser::STATUS_ACTIVE,
            ]
        );

        $this->syncStaffQuota($school->fresh());

        if (! $user->current_school_id) {
            $user->update(['current_school_id' => $school->id]);
        }

        return response()->json($schoolUser->load('user', 'role'), 201);
    }

    public function update(Request $request, School $school, SchoolUser $member)
    {
        $this->authorizeDirecteur($request, $school);
        $this->ensureMemberBelongsToSchool($school, $member);

        if ($member->role?->slug === 'directeur') {
            abort(422, 'Le directeur ne peut pas être modifié depuis cette page.');
        }

        $validated = $request->validate([
            'fullname' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'max:255', 'unique:users,email,'.$member->user_id],
            'phone' => ['nullable', 'string', 'max:30'],
            'role_id' => ['required', 'uuid', 'exists:roles,id'],
        ]);

        $role = Role::findOrFail($validated['role_id']);

        if (in_array($role->slug, self::RESTRICTED_ROLE_SLUGS, true)) {
            throw ValidationException::withMessages([
                'role_id' => ['Ce rôle ne peut pas être attribué via la gestion des membres.'],
            ]);
        }

        $this->guardAgainstRoleConflict($school, $member->user, $validated['role_id']);
        $member->user->update(collect($validated)->except('role_id')->all());
        $member->update(['role_id' => $validated['role_id']]);
        $this->syncStaffQuota($school->fresh());

        return response()->json($member->fresh()->load('user', 'role'));
    }

    public function destroy(Request $request, School $school, SchoolUser $member)
    {
        $this->authorizeDirecteur($request, $school);
        $this->ensureMemberBelongsToSchool($school, $member);

        if ($member->role?->slug === 'directeur' || $member->user_id === $request->user()->id) {
            abort(422, "Le directeur et votre propre compte ne peuvent pas être retirés de l'école.");
        }

        $member->delete();
        $this->syncStaffQuota($school->fresh());

        return response()->json(['message' => 'Membre retiré de l’école.']);
    }

    private function ensureMemberBelongsToSchool(School $school, SchoolUser $member): void
    {
        abort_unless($member->school_id === $school->id, 404);
    }
}
