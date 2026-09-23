<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Api\Concerns\AuthorizesSchoolDirecteur;
use App\Http\Controllers\Api\Concerns\EnforcesStaffQuota;
use App\Http\Controllers\Api\Concerns\ResolvesMemberUser;
use App\Http\Controllers\Controller;
use App\Models\ActivityLog;
use App\Models\MemberInvitation;
use App\Models\Role;
use App\Models\School;
use App\Models\SchoolUser;
use App\Models\User;
use App\Services\BrevoService;
use App\Services\SchoolAdminPermissionService;
use App\Services\HrPermissionService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class SchoolMemberController extends Controller
{
    use AuthorizesSchoolDirecteur, EnforcesStaffQuota, ResolvesMemberUser;

    private SchoolAdminPermissionService $schoolAdminPermissionService;
    private HrPermissionService $hrPermissionService;

    public function __construct()
    {
        $this->schoolAdminPermissionService = app(SchoolAdminPermissionService::class);
        $this->hrPermissionService = app(HrPermissionService::class);
    }

    /**
     * Les rôles gérés par d'autres modules spécifiques.
     * Note: Si vous souhaitez autoriser la création de directeurs de section (ex: Proviseur),
     * retirez 'directeur' de cette liste.
     */
    private const RESTRICTED_ROLE_SLUGS = ['parent', 'eleve', 'professeur', 'enseignant', 'infirmier'];

    /**
     * Masqués de la liste générique des membres administratifs.
     */
    private const HIDDEN_FROM_LIST_ROLE_SLUGS = ['parent', 'eleve', 'professeur', 'enseignant'];

    public function index(Request $request, School $school)
    {
        $actor = $this->actingMember($request, $school);

        if (
            ! $this->schoolAdminPermissionService->isAdmin($actor)
            && ! $this->hrPermissionService->canManage($actor)
        ) {
            abort(403, "Vous n'avez pas accès aux membres de cette école.");
        }

        return response()->json(
            SchoolUser::query()
                ->where('school_id', $school->id)
                ->whereHas('role', fn($query) => $query->whereNotIn('slug', self::HIDDEN_FROM_LIST_ROLE_SLUGS))
                ->when(
                    $this->hrPermissionService->isOwner($actor),
                    fn($query) => $query->whereHas('role', fn($roleQuery) => $roleQuery->where('slug', 'rh'))
                )
                ->when(
                    ! $this->schoolAdminPermissionService->isOwner($actor) && $actor->sections->isNotEmpty(),
                    fn($query) => $query->whereHas('sections', fn($q) => $q->whereIn('sections.id', $actor->sections->pluck('id')))
                )
                ->when(
                    $request->query('search'),
                    fn($query, $search) => $query->whereHas('user', fn($q) => $q->where('fullname', 'like', "%{$search}%"))
                )
                ->with(['user', 'role', 'sections'])
                ->paginate($request->integer('per_page', 10))
        );
    }

    public function store(Request $request, School $school)
    {
        $actor = $this->actingMember($request, $school);

        $validated = $request->validate([
            'fullname' => ['nullable', 'string', 'max:255'],
            'email' => ['nullable', 'required_without:phone', 'email'],
            'phone' => ['nullable', 'required_without:email', 'phone:INTERNATIONAL'],
            'role_id' => ['required', 'uuid', 'exists:roles,id'],
            'section_ids' => ['nullable', 'array'],
            'section_ids.*' => ['uuid', 'distinct', 'exists:sections,id'],
        ], [
            'phone.phone' => 'Le numéro de téléphone doit être valide et inclure son indicatif international, par exemple +226 70 00 00 00.',
        ]);

        $role = Role::findOrFail($validated['role_id']);

        if ($this->hrPermissionService->isOwner($actor) && $role->slug !== 'rh') {
            abort(403, 'Un responsable RH ne peut créer que des comptes RH.');
        }

        if (
            ! $this->schoolAdminPermissionService->isAdmin($actor)
            && ! $this->hrPermissionService->canManage($actor)
        ) {
            abort(403, "Vous n'êtes pas autorisé à créer ce membre.");
        }

        if (in_array($role->slug, self::RESTRICTED_ROLE_SLUGS, true)) {
            throw ValidationException::withMessages([
                'role_id' => ['Ce rôle ne peut pas être attribué depuis cette interface.'],
            ]);
        }

        if ($role->slug === 'admin' && ! $this->schoolAdminPermissionService->canCreateAdmin($actor, $validated['section_ids'] ?? [])) {
            throw ValidationException::withMessages([
                'role_id' => ['Seul l’administrateur principal ou un administrateur global peut créer un compte admin.'],
            ]);
        }

        $sectionIds = $this->normalizeSectionIdsForActor($actor, $validated['section_ids'] ?? []);

        $this->authorizeSectionAssignment($school, $actor, $role, $sectionIds);

        $user = $this->resolveUser($validated);
        $this->guardAgainstRoleConflict($school, $user, $validated['role_id']);

        $temporaryPassword = null;

        if ($user->wasRecentlyCreated) {
            $temporaryPassword = Str::password(16, letters: true, numbers: true, symbols: false, spaces: false);
            $user->forceFill([
                'password' => Hash::make($temporaryPassword),
            ]);
            $user->save();

            $this->sendTemporaryPasswordEmail($school, $user, $temporaryPassword);
        }

        $schoolUser = SchoolUser::query()->updateOrCreate(
            [
                'school_id' => $school->id,
                'user_id' => $user->id,
            ],
            [
                'role_id' => $validated['role_id'],
                'status' => SchoolUser::STATUS_ACTIVE,
                'is_owner' => $this->ownerFlagForRole($school, $role->slug),
            ]
        );

        // Synchronisation des sections attribuées dans school_user_sections
        if (array_key_exists('section_ids', $validated) || $sectionIds !== []) {
            $schoolUser->sections()->sync($sectionIds);
        }

        $this->syncStaffQuota($school->fresh());

        if (! $user->current_school_id) {
            $user->update(['current_school_id' => $school->id]);
        }

        return response()->json($schoolUser->load('user', 'role', 'sections'), 201);
    }

    public function createInvitation(Request $request, School $school)
    {
        $actor = $this->actingMember($request, $school);
        $validated = $request->validate([
            'role_id' => ['required', 'uuid', 'exists:roles,id'],
            'section_ids' => ['nullable', 'array'],
            'section_ids.*' => ['uuid', 'distinct', 'exists:sections,id'],
        ], [
            'phone.phone' => 'Le numéro de téléphone doit être valide et inclure son indicatif international.',
        ]);

        $role = Role::findOrFail($validated['role_id']);
        $this->authorizeMemberCreation($actor, $school, $role, $validated['section_ids'] ?? []);
        $sectionIds = $this->normalizeSectionIdsForActor($actor, $validated['section_ids'] ?? []);
        $this->authorizeSectionAssignment($school, $actor, $role, $sectionIds);

        $token = Str::random(64);
        $invitation = MemberInvitation::create([
            'token_hash' => hash('sha256', $token),
            'school_id' => $school->id,
            'role_id' => $role->id,
            'created_by' => $request->user()->id,
            'section_ids' => $sectionIds,
            'expires_at' => now()->addHours(24),
        ]);

        $frontendUrl = rtrim(config('app.frontend_url', config('app.url')), '/');

        return response()->json([
            'invitation_url' => $frontendUrl . '/accept-invitation?token=' . $token,
            'expires_at' => $invitation->expires_at->toISOString(),
        ], 201);
    }

    public function acceptInvitation(Request $request)
    {
        $validated = $request->validate([
            'token' => ['required', 'string', 'size:64'],
            'fullname' => ['required', 'string', 'max:255'],
            'email' => ['nullable', 'required_without:phone', 'email', 'max:255'],
            'phone' => ['nullable', 'required_without:email', 'phone:INTERNATIONAL'],
            'password' => ['required', 'string', 'min:8', 'confirmed'],
        ]);

        $invitation = MemberInvitation::query()
            ->where('token_hash', hash('sha256', $validated['token']))
            ->where('status', MemberInvitation::STATUS_PENDING)
            ->where('expires_at', '>', now())
            ->first();

        if (! $invitation) {
            abort(410, 'Cette invitation est invalide ou expirée.');
        }

        $existing = User::query()
            ->where(function ($query) use ($validated) {
                $query->where('email', $validated['email'] ?? '__none__')
                    ->orWhere('phone', $validated['phone'] ?? '__none__');
            })
            ->exists();

        if ($existing) {
            throw ValidationException::withMessages([
                'email' => ['Un compte existe déjà avec ces coordonnées. Utilisez la procédure de connexion ou contactez l’administration.'],
            ]);
        }

        $invitation->update([
            'fullname' => $validated['fullname'],
            'email' => $validated['email'] ?? null,
            'phone' => $validated['phone'] ?? null,
            'password' => Hash::make($validated['password']),
            'status' => MemberInvitation::STATUS_SUBMITTED,
            'submitted_at' => now(),
        ]);

        return response()->json(['message' => 'Demande envoyée. Elle sera activée après validation par l’administration.']);
    }

    public function invitations(Request $request, School $school)
    {
        $actor = $this->actingMember($request, $school);
        $this->authorizeMemberManagement($actor);

        return response()->json(MemberInvitation::query()
            ->where('school_id', $school->id)
            ->whereIn('status', [MemberInvitation::STATUS_PENDING, MemberInvitation::STATUS_SUBMITTED])
            ->with(['role', 'creator'])
            ->latest()
            ->get());
    }

    public function reviewInvitation(Request $request, School $school, MemberInvitation $invitation)
    {
        $actor = $this->actingMember($request, $school);
        $this->authorizeMemberManagement($actor);
        abort_unless($invitation->school_id === $school->id, 404);

        $validated = $request->validate([
            'decision' => ['required', 'in:accept,reject'],
            'rejection_reason' => ['nullable', 'string', 'max:1000'],
        ]);

        abort_unless($invitation->status === MemberInvitation::STATUS_SUBMITTED, 422, 'Cette invitation a déjà été traitée.');
        abort_if($invitation->expires_at->isPast(), 410, 'Cette invitation a expiré.');

        if ($validated['decision'] === 'reject') {
            $invitation->update([
                'status' => MemberInvitation::STATUS_REJECTED,
                'reviewed_by' => $request->user()->id,
                'reviewed_at' => now(),
                'rejection_reason' => $validated['rejection_reason'] ?? null,
                'password' => null,
            ]);

            return response()->json(['message' => 'Invitation rejetée.']);
        }

        $user = DB::transaction(function () use ($invitation, $request, $school, $actor) {
            $user = User::query()
                ->where(function ($query) use ($invitation) {
                    if ($invitation->email) {
                        $query->where('email', $invitation->email);
                    }
                    if ($invitation->phone) {
                        $method = $invitation->email ? 'orWhere' : 'where';
                        $query->{$method}('phone', $invitation->phone);
                    }
                })
                ->first();

            if ($user) {
                throw ValidationException::withMessages(['invitation' => ['Un compte existe déjà avec ces coordonnées.']]);
            }

            $role = $invitation->role;
            $this->authorizeSectionAssignment($school, $actor, $role, $invitation->section_ids ?? []);
            $user = User::create([
                'fullname' => $invitation->fullname,
                'email' => $invitation->email,
                'phone' => $invitation->phone,
                'password' => $invitation->password,
            ]);
            $schoolUser = SchoolUser::create([
                'school_id' => $school->id,
                'user_id' => $user->id,
                'role_id' => $invitation->role_id,
                'status' => SchoolUser::STATUS_ACTIVE,
                'is_owner' => false,
            ]);
            $schoolUser->sections()->sync($invitation->section_ids ?? []);
            $user->update(['current_school_id' => $school->id]);

            return $user;
        });

        $invitation->update([
            'status' => MemberInvitation::STATUS_ACCEPTED,
            'reviewed_by' => $request->user()->id,
            'reviewed_at' => now(),
            'password' => null,
        ]);

        return response()->json(['message' => 'Invitation validée.', 'user' => $user]);
    }

    private function authorizeMemberManagement(SchoolUser $actor): void
    {
        if (! $this->schoolAdminPermissionService->isAdmin($actor) && ! $this->hrPermissionService->canManage($actor)) {
            abort(403, "Vous n'avez pas accès aux invitations.");
        }
    }

    private function authorizeMemberCreation(SchoolUser $actor, School $school, Role $role, array $sectionIds): void
    {
        if (! $this->schoolAdminPermissionService->isAdmin($actor) && ! $this->hrPermissionService->canManage($actor)) {
            abort(403, "Vous n'êtes pas autorisé à inviter ce membre.");
        }

        if ($this->hrPermissionService->isOwner($actor) && $role->slug !== 'rh') {
            abort(403, 'Un responsable RH ne peut inviter que des comptes RH.');
        }

        if (in_array($role->slug, self::RESTRICTED_ROLE_SLUGS, true)) {
            throw ValidationException::withMessages([
                'role_id' => ['Ce rôle ne peut pas être attribué depuis cette interface.'],
            ]);
        }

        if ($role->slug === 'admin' && ! $this->schoolAdminPermissionService->canCreateAdmin($actor, $sectionIds)) {
            throw ValidationException::withMessages([
                'role_id' => ['Seul l’administrateur principal ou un administrateur global peut inviter un compte admin.'],
            ]);
        }
    }

    private function sendTemporaryPasswordEmail(School $school, User $user, string $temporaryPassword): void
    {
        $brevo = app(BrevoService::class);
        $userDisplayName = $user->fullname ?: $user->email;
        $loginUrl = rtrim(config('app.frontend_url', config('app.url')), '/') . '/login';

        $brevo->send(
            toEmail: $user->email,
            toName: $userDisplayName,
            subject: 'Bienvenue chez ' . $school->name . ' — veuillez modifier votre mot de passe',
            htmlContent: <<<HTML
                <p>Bonjour <strong>{$userDisplayName}</strong>,</p>
                <p>Votre compte a été créé sur <strong>{$school->name}</strong>.</p>
                <p>Votre mot de passe temporaire est : <strong>{$temporaryPassword}</strong></p>
                <p>Pour vous connecter, cliquez sur le lien suivant : <a href="{$loginUrl}">Se connecter</a></p>
                <p>Veuillez vous connecter puis modifier votre mot de passe dès votre première connexion.</p>
                <p>Merci.</p>
            HTML,
        );
    }

    public function update(Request $request, School $school, SchoolUser $member)
    {
        $actor = $this->actingMember($request, $school);
        $this->ensureMemberBelongsToSchool($school, $member);
        $this->ensureMemberIsWithinActorSections($actor, $member);

        if ($this->hrPermissionService->isOwner($actor) && ! $this->hrPermissionService->canManage($actor, $member)) {
            abort(403, 'Un responsable RH ne peut gérer que les comptes RH.');
        }

        if (
            ! $this->schoolAdminPermissionService->isAdmin($actor)
            && ! $this->hrPermissionService->canManage($actor, $member)
        ) {
            abort(403, "Vous n'êtes pas autorisé à modifier ce membre.");
        }

        if ($member->role?->slug === 'admin' && $this->schoolAdminPermissionService->isOwner($member)) {
            abort(422, 'Le compte administrateur principal ne peut pas être modifié depuis cette interface.');
        }

        $validated = $request->validate([
            'fullname' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'max:255', 'unique:users,email,' . $member->user_id],
            'phone' => ['nullable', 'phone:INTERNATIONAL'],
            'role_id' => ['required', 'uuid', 'exists:roles,id'],
            'section_ids' => ['nullable', 'array'],
            'section_ids.*' => ['uuid', 'distinct', 'exists:sections,id'],
        ]);

        $role = Role::findOrFail($validated['role_id']);

        if ($this->hrPermissionService->isOwner($actor) && $role->slug !== 'rh') {
            abort(403, 'Un responsable RH ne peut attribuer que le rôle RH.');
        }

        if (in_array($role->slug, self::RESTRICTED_ROLE_SLUGS, true)) {
            throw ValidationException::withMessages([
                'role_id' => ['Ce rôle ne peut pas être attribué depuis cette interface.'],
            ]);
        }

        if ($role->slug === 'admin' && ! $this->schoolAdminPermissionService->canCreateAdmin($actor, $validated['section_ids'] ?? [])) {
            throw ValidationException::withMessages([
                'role_id' => ['Seul l’administrateur principal ou un administrateur global peut affecter le rôle admin.'],
            ]);
        }

        $sectionIds = $this->normalizeSectionIdsForActor($actor, $validated['section_ids'] ?? []);

        $this->authorizeSectionAssignment($school, $actor, $role, $sectionIds);

        $this->guardAgainstRoleConflict($school, $member->user, $validated['role_id']);

        // Mise à jour des infos utilisateur et du rôle
        $member->user->update(collect($validated)->except(['role_id', 'section_ids'])->all());
        $member->update([
            'role_id' => $validated['role_id'],
            'is_owner' => $this->ownerFlagForRole($school, $role->slug, $member),
        ]);

        // Mise à jour des sections restreintes
        if (array_key_exists('section_ids', $validated) || $sectionIds !== []) {
            $member->sections()->sync($sectionIds);
        }

        $newSectionIds = $member->sections()->pluck('sections.id')->sort()->values()->all();
        if ($previousRoleId !== $member->role_id || $previousSectionIds !== $newSectionIds) {
            ActivityLog::create([
                'action' => 'member_access_changed',
                'model' => get_class($member),
                'model_id' => $member->id,
                'user_id' => $request->user()->id,
                'school_id' => $school->id,
                'old_values' => [
                    'role_id' => $previousRoleId,
                    'section_ids' => $previousSectionIds,
                ],
                'new_values' => [
                    'role_id' => $member->role_id,
                    'section_ids' => $newSectionIds,
                ],
            ]);
        }

        $this->syncStaffQuota($school->fresh());

        return response()->json($member->fresh()->load('user', 'role', 'sections'));
    }

    public function destroy(Request $request, School $school, SchoolUser $member)
    {
        $actor = $this->actingMember($request, $school);
        $this->ensureMemberBelongsToSchool($school, $member);
        $this->ensureMemberIsWithinActorSections($actor, $member);

        if (
            ! $this->schoolAdminPermissionService->isAdmin($actor)
            && ! $this->hrPermissionService->canManage($actor, $member)
        ) {
            abort(403, "Vous n'êtes pas autorisé à retirer ce membre.");
        }

        if ($this->schoolAdminPermissionService->isOwner($member) || $member->user_id === $request->user()->id) {
            abort(422, "L’administrateur principal et votre propre compte ne peuvent pas être retirés de l'école.");
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

        if ($this->schoolAdminPermissionService->isOwner($actor)) {
            return;
        }

        if ($this->hrPermissionService->isOwner($actor)) {
            if ($actor->sections->isNotEmpty() && ! $this->hrPermissionService->canAssignSections($actor, $sectionIds)) {
                abort(403, 'Vous ne pouvez affecter que vos sections RH.');
            }

            return;
        }

        if (! $this->schoolAdminPermissionService->isAdmin($actor)) {
            abort(403, 'Seuls les administrateurs de l’école peuvent gérer les affectations de sections.');
        }

        if (! $this->schoolAdminPermissionService->canAssignSections($actor, $sectionIds)) {
            abort(403, 'Vous ne pouvez pas affecter des sections hors de votre périmètre.');
        }
    }

    private function normalizeSectionIdsForActor(SchoolUser $actor, array $sectionIds): array
    {
        if ($this->hrPermissionService->isOwner($actor) && $sectionIds === []) {
            throw ValidationException::withMessages([
                'section_ids' => ['Vous devez attribuer au moins une section à ce compte RH. Un RH ne peut pas créer un accès global.'],
            ]);
        }

        return $sectionIds;
    }

    private function ownerFlagForRole(School $school, string $roleSlug, ?SchoolUser $currentMember = null): bool
    {
        if (! in_array($roleSlug, ['rh', 'comptable'], true)) {
            return false;
        }

        if ($currentMember?->role?->slug === $roleSlug && (bool) $currentMember->is_owner) {
            return true;
        }

        return ! SchoolUser::query()
            ->where('school_id', $school->id)
            ->where('status', SchoolUser::STATUS_ACTIVE)
            ->when($currentMember, fn($query) => $query->where(
                $currentMember->getKeyName(),
                '!=',
                $currentMember->getKey(),
            ))
            ->where('is_owner', true)
            ->whereHas('role', fn($query) => $query->where('slug', $roleSlug))
            ->exists();
    }

    private function ensureMemberIsWithinActorSections(SchoolUser $actor, SchoolUser $member): void
    {
        if (
            $this->schoolAdminPermissionService->isOwner($actor)
            || $this->hrPermissionService->isOwner($actor) && $actor->sections->isEmpty()
            || $actor->sections->isEmpty()
        ) {
            return;
        }

        if ($this->hrPermissionService->isOwner($actor)) {
            $targetSectionIds = $member->sections->pluck('id')->all();
            if ($targetSectionIds === [] || ! empty(array_diff($targetSectionIds, $actor->sections->pluck('id')->all()))) {
                abort(403, 'Vous ne pouvez gérer que les RH de vos sections.');
            }
            return;
        }

        if (! $this->schoolAdminPermissionService->canManageMember($actor, $member)) {
            abort(403, 'Vous ne pouvez gérer que les membres de vos sections.');
        }
    }
}
