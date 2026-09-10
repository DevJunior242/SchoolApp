<?php

namespace App\Http\Controllers\Api;

use App\Models\Role;
use App\Models\School;
use App\Models\SchoolUser;
use Illuminate\Http\Request;
use App\Http\Controllers\Controller;
use Illuminate\Validation\ValidationException;
use App\Http\Controllers\Api\Concerns\EnforcesStaffQuota;
use App\Http\Controllers\Api\Concerns\ResolvesMemberUser;
use App\Http\Controllers\Api\Concerns\AuthorizesSchoolDirecteur;

class SchoolMemberController extends Controller
{
    use AuthorizesSchoolDirecteur, EnforcesStaffQuota, ResolvesMemberUser;

    /**
     * Les rôles gérés par d'autres modules spécifiques.
     * Note: Si vous souhaitez autoriser la création de directeurs de section (ex: Proviseur),
     * retirez 'directeur' de cette liste.
     */
    private const RESTRICTED_ROLE_SLUGS = ['parent', 'eleve', 'professeur', 'infirmier'];

    /**
     * Masqués de la liste générique des membres administratifs.
     */
    private const HIDDEN_FROM_LIST_ROLE_SLUGS = ['parent', 'eleve', 'professeur'];

    public function index(Request $request, School $school)
    {
        $this->authorizeDirecteur($request, $school);
        $actor = $this->actingMember($request, $school);

        return response()->json(
            SchoolUser::query()
                ->where('school_id', $school->id)
                ->whereHas('role', fn ($query) => $query->whereNotIn('slug', self::HIDDEN_FROM_LIST_ROLE_SLUGS))
                ->when(
                    $actor->role->slug !== 'fondateur' && $actor->sections->isNotEmpty(),
                    fn ($query) => $query->whereHas('sections', fn ($q) => $q->whereIn('sections.id', $actor->sections->pluck('id')))
                )
                ->when(
                    $request->query('search'),
                    fn ($query, $search) => $query->whereHas('user', fn ($q) => $q->where('fullname', 'like', "%{$search}%"))
                )
                ->with(['user', 'role', 'sections']) // Chargement des sections affectées
                ->paginate($request->integer('per_page', 10))
        );
    }

  public function store(Request $request, School $school)
{
    $this->authorizeDirecteur($request, $school);
    $actor = $this->actingMember($request, $school);

    $validated = $request->validate([
        'fullname' => ['nullable', 'string', 'max:255'],
        'email' => ['nullable', 'required_without:phone', 'email'],
        'phone' => ['nullable', 'required_without:email', 'string', 'max:30'],
        'role_id' => ['required', 'uuid', 'exists:roles,id'],
        'section_ids' => ['nullable', 'array'],
        'section_ids.*' => ['uuid', 'distinct', 'exists:sections,id'],
    ]);

    $role = Role::findOrFail($validated['role_id']);

    // 1. Refus catégorique du rôle Fondateur ou rôles système restreints
    if ($role->slug === 'fondateur' || in_array($role->slug, self::RESTRICTED_ROLE_SLUGS, true)) {
        throw ValidationException::withMessages([
            'role_id' => ["Le rôle Fondateur ne peut pas être attribué."],
        ]);
    }

    // 2. Seul un Fondateur a le droit d'attribuer le rôle Directeur
    if ($role->slug === 'directeur' && $actor->role->slug !== 'fondateur') {
        throw ValidationException::withMessages([
            'role_id' => ["Seul le fondateur de l'établissement est autorisé à nommer un Directeur."],
        ]);
    }

    $this->authorizeSectionAssignment($school, $actor, $role, $validated['section_ids'] ?? []);

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

    // Synchronisation des sections attribuées dans school_user_sections
    if (array_key_exists('section_ids', $validated)) {
        $schoolUser->sections()->sync($validated['section_ids'] ?? []);
    }

    $this->syncStaffQuota($school->fresh());

    if (! $user->current_school_id) {
        $user->update(['current_school_id' => $school->id]);
    }

    return response()->json($schoolUser->load('user', 'role', 'sections'), 201);
}

public function update(Request $request, School $school, SchoolUser $member)
{
    $this->authorizeDirecteur($request, $school);
    $actor = $this->actingMember($request, $school);
    $this->ensureMemberBelongsToSchool($school, $member);
    $this->ensureMemberIsWithinActorSections($actor, $member);

    // Protection du compte Fondateur principal
    if ($member->role?->slug === 'fondateur') {
        abort(422, 'Le compte fondateur ne peut pas être modifié depuis cette interface.');
    }

    $validated = $request->validate([
        'fullname' => ['required', 'string', 'max:255'],
        'email' => ['required', 'email', 'max:255', 'unique:users,email,'.$member->user_id],
        'phone' => ['nullable', 'string', 'max:30'],
        'role_id' => ['required', 'uuid', 'exists:roles,id'],
        'section_ids' => ['nullable', 'array'],
        'section_ids.*' => ['uuid', 'distinct', 'exists:sections,id'],
    ]);

    $role = Role::findOrFail($validated['role_id']);

    // 1. Refus catégorique du rôle Fondateur ou rôles système restreints
    if ($role->slug === 'fondateur' || in_array($role->slug, self::RESTRICTED_ROLE_SLUGS, true)) {
        throw ValidationException::withMessages([
            'role_id' => ["Le rôle Fondateur ne peut pas être attribué."],
        ]);
    }

    // 2. Seul un Fondateur a le droit de promouvoir un membre au rôle Directeur
    if ($role->slug === 'directeur' && $actor->role->slug !== 'fondateur') {
        throw ValidationException::withMessages([
            'role_id' => ["Seul le fondateur de l'établissement est autorisé à attribuer le rôle Directeur."],
        ]);
    }

    $this->authorizeSectionAssignment($school, $actor, $role, $validated['section_ids'] ?? []);

    $this->guardAgainstRoleConflict($school, $member->user, $validated['role_id']);

    // Mise à jour des infos utilisateur et du rôle
    $member->user->update(collect($validated)->except(['role_id', 'section_ids'])->all());
    $member->update(['role_id' => $validated['role_id']]);

    // Mise à jour des sections restreintes
    if (array_key_exists('section_ids', $validated)) {
        $member->sections()->sync($validated['section_ids'] ?? []);
    }

    $this->syncStaffQuota($school->fresh());

    return response()->json($member->fresh()->load('user', 'role', 'sections'));
}

    public function destroy(Request $request, School $school, SchoolUser $member)
    {
        $this->authorizeDirecteur($request, $school);
        $actor = $this->actingMember($request, $school);
        $this->ensureMemberBelongsToSchool($school, $member);
        $this->ensureMemberIsWithinActorSections($actor, $member);

        if ($member->role?->slug === 'fondateur' || $member->user_id === $request->user()->id) {
            abort(422, "Le fondateur et votre propre compte ne peuvent pas être retirés de l'école.");
        }

        // Les entrées dans school_user_sections seront supprimées automatiquement via cascadeOnDelete()
        $member->delete();
        $this->syncStaffQuota($school->fresh());

        return response()->json(['message' => 'Membre retiré de l’école.']);
    }

    private function ensureMemberBelongsToSchool(School $school, SchoolUser $member): void
    {
        abort_unless($member->school_id === $school->id, 404);
    }

    private function actingMember(Request $request, School $school): SchoolUser
    {
        return SchoolUser::query()
            ->where('school_id', $school->id)
            ->where('user_id', $request->user()->id)
            ->where('status', SchoolUser::STATUS_ACTIVE)
            ->with(['role', 'sections'])
            ->firstOrFail();
    }

    private function authorizeSectionAssignment(School $school, SchoolUser $actor, Role $role, array $sectionIds): void
    {
        $activeSectionIds = $school->sections()
            ->wherePivot('active', true)
            ->pluck('sections.id')
            ->all();

        if (array_diff($sectionIds, $activeSectionIds)) {
            throw ValidationException::withMessages([
                'section_ids' => ['Chaque section doit être active dans cette école.'],
            ]);
        }

        if ($actor->role->slug === 'fondateur') {
            return;
        }

        if ($role->slug === 'directeur') {
            abort(403, 'Seul le fondateur peut attribuer le rôle directeur.');
        }

        // Un directeur sans section est un directeur général : accès global.
        if ($actor->sections->isEmpty()) {
            return;
        }

        if (empty($sectionIds) || array_diff($sectionIds, $actor->sections->pluck('id')->all())) {
            abort(403, 'Vous pouvez attribuer uniquement vos propres sections.');
        }
    }

    private function ensureMemberIsWithinActorSections(SchoolUser $actor, SchoolUser $member): void
    {
        if ($actor->role->slug === 'fondateur' || $actor->sections()->doesntExist()) {
            return;
        }

        $memberSectionIds = $member->sections()->pluck('sections.id')->all();

        if (empty($memberSectionIds) || array_diff($memberSectionIds, $actor->sections->pluck('id')->all())) {
            abort(403, 'Vous ne pouvez gérer que les membres de vos sections.');
        }
    }
}
