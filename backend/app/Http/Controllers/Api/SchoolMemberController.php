<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Api\Concerns\AuthorizesSchoolDirecteur;
use App\Http\Controllers\Api\Concerns\EnforcesStaffQuota;
use App\Http\Controllers\Api\Concerns\ResolvesMemberUser;
use App\Http\Controllers\Controller;
use App\Models\Role;
use App\Models\School;
use App\Models\SchoolUser;
use App\Models\User;
use App\Services\BrevoService;
use App\Services\SchoolAdminPermissionService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class SchoolMemberController extends Controller
{
    use AuthorizesSchoolDirecteur, EnforcesStaffQuota, ResolvesMemberUser;

    private SchoolAdminPermissionService $schoolAdminPermissionService;

    public function __construct()
    {
        $this->schoolAdminPermissionService = app(SchoolAdminPermissionService::class);
    }

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
                ->whereHas('role', fn($query) => $query->whereNotIn('slug', self::HIDDEN_FROM_LIST_ROLE_SLUGS))
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
        $this->authorizeDirecteur($request, $school);
        $actor = $this->actingMember($request, $school);

        $validated = $request->validate([
            'fullname' => ['nullable', 'string', 'max:255'],
            'email' => ['nullable', 'required_without:phone', 'email'],
            'phone' => ['nullable', 'required_without:email', 'phone:INTERNATIONAL'],
            'role_id' => ['required', 'uuid', 'exists:roles,id'],
            'section_ids' => ['nullable', 'array'],
            'section_ids.*' => ['uuid', 'distinct', 'exists:sections,id'],
        ]);

        $role = Role::findOrFail($validated['role_id']);

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

        $this->authorizeSectionAssignment($school, $actor, $role, $validated['section_ids'] ?? []);

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
        $this->authorizeDirecteur($request, $school);
        $actor = $this->actingMember($request, $school);
        $this->ensureMemberBelongsToSchool($school, $member);
        $this->ensureMemberIsWithinActorSections($actor, $member);

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

        if (! $this->schoolAdminPermissionService->isAdmin($actor)) {
            abort(403, 'Seuls les administrateurs de l’école peuvent gérer les affectations de sections.');
        }

        if (! $this->schoolAdminPermissionService->canAssignSections($actor, $sectionIds)) {
            abort(403, 'Vous ne pouvez pas affecter des sections hors de votre périmètre.');
        }
    }

    private function ensureMemberIsWithinActorSections(SchoolUser $actor, SchoolUser $member): void
    {
        if ($this->schoolAdminPermissionService->isOwner($actor) || $actor->sections->isEmpty()) {
            return;
        }

        if (! $this->schoolAdminPermissionService->canManageMember($actor, $member)) {
            abort(403, 'Vous ne pouvez gérer que les membres de vos sections.');
        }
    }
}
