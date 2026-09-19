<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Api\Concerns\AuthorizesSchoolDirecteur;
use App\Http\Controllers\Api\Concerns\EnforcesStaffQuota;
use App\Http\Controllers\Api\Concerns\ResolvesMemberUser;
use App\Http\Controllers\Controller;
use App\Models\Role;
use App\Models\School;
use App\Models\SchoolUser;
use App\Services\BrevoService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class TeacherController extends Controller
{
    use AuthorizesSchoolDirecteur, EnforcesStaffQuota, ResolvesMemberUser;

    public function index(Request $request, School $school)
    {
        $this->authorizeDirecteur($request, $school);

        return response()->json(
            SchoolUser::query()
                ->where('school_id', $school->id)
                ->whereHas('role', fn($query) => $query->whereIn('slug', ['professeur', 'enseignant']))
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

        $validated = $request->validate([
            'fullname' => ['nullable', 'string', 'max:255'],
            'email' => ['nullable', 'required_without:phone', 'email'],
            'phone' => ['nullable', 'required_without:email', 'phone:INTERNATIONAL'],
            'section_ids' => ['required', 'array', 'min:1'],
            'section_ids.*' => ['uuid', 'distinct', 'exists:sections,id'],
        ], [
            'phone.phone' => 'Le numéro de téléphone doit être valide et inclure son indicatif international, par exemple +226 70 00 00 00.',
        ]);

        $sections = $school->sections()
            ->wherePivot('active', true)
            ->whereIn('sections.id', $validated['section_ids'])
            ->get(['sections.id', 'sections.name']);

        if ($sections->count() !== count($validated['section_ids'])) {
            return response()->json([
                'message' => 'Chaque section sélectionnée doit être active dans cette école.',
            ], 422);
        }

        $roleSlug = $this->roleSlugForSections($sections);
        $teacherRole = Role::query()->where('slug', $roleSlug)->firstOrFail();
        $sectionIds = $sections->pluck('id')->all();
        $user = $this->resolveUser($validated);
        $this->guardAgainstRoleConflict($school, $user, $teacherRole->id);

        if ($user->wasRecentlyCreated) {
            $temporaryPassword = Str::password(16, letters: true, numbers: true, symbols: false, spaces: false);
            $user->forceFill([
                'password' => Hash::make($temporaryPassword),
            ])->save();

            $loginUrl = rtrim(config('app.frontend_url', config('app.url')), '/') . '/login';
            app(BrevoService::class)->send(
                toEmail: $user->email,
                toName: $user->fullname ?: $user->email,
                subject: 'Bienvenue chez ' . $school->name . ' — veuillez modifier votre mot de passe',
                htmlContent: '<p>Bonjour <strong>' . e($user->fullname ?: $user->email) . '</strong>,</p>'
                    . '<p>Votre compte professeur a été créé sur <strong>' . e($school->name) . '</strong>.</p>'
                    . '<p>Votre mot de passe temporaire est : <strong>' . e($temporaryPassword) . '</strong></p>'
                    . '<p>Connectez-vous ici : <a href="' . e($loginUrl) . '">Se connecter</a></p>'
                    . '<p>Veuillez modifier ce mot de passe après votre première connexion.</p>',
            );
        }

        $schoolUser = SchoolUser::query()->updateOrCreate(
            [
                'school_id' => $school->id,
                'user_id' => $user->id,
            ],
            [
                'role_id' => $teacherRole->id,
                'status' => SchoolUser::STATUS_ACTIVE,
            ]
        );

        $schoolUser->sections()->sync($sectionIds);

        $this->syncStaffQuota($school->fresh());

        // Ne bascule l'école active que si le prof n'en a pas encore une
        // (on n'écrase pas le contexte d'un prof déjà actif ailleurs).
        if (! $user->current_school_id) {
            $user->update(['current_school_id' => $school->id]);
        }

        return response()->json($schoolUser->load('user', 'role', 'sections'), 201);
    }

    public function update(Request $request, School $school, SchoolUser $schoolUser)
    {
        $this->authorizeDirecteur($request, $school);

        // Vérifier que le schoolUser appartient à l'école
        if ($schoolUser->school_id !== $school->id) {
            return response()->json(['message' => 'Professeur non trouvé'], 404);
        }

        $validated = $request->validate([
            'fullname' => ['nullable', 'string', 'max:255'],
            'email' => ['nullable', 'email'],
            'phone' => ['nullable', 'phone:INTERNATIONAL'],
            'section_ids' => ['sometimes', 'array', 'min:1'],
            'section_ids.*' => ['uuid', 'distinct', 'exists:sections,id'],
        ], [
            'phone.phone' => 'Le numéro de téléphone doit être valide et inclure son indicatif international, par exemple +226 70 00 00 00.',
        ]);

        // Update l'utilisateur associé
        $userPayload = collect($validated)->except(['section_ids'])->all();
        if (!empty($userPayload)) {
            $schoolUser->user->update(array_filter($userPayload));
        }

        if (array_key_exists('section_ids', $validated)) {
            $sections = $school->sections()
                ->wherePivot('active', true)
                ->whereIn('sections.id', $validated['section_ids'])
                ->get(['sections.id', 'sections.name']);

            if ($sections->count() !== count($validated['section_ids'])) {
                return response()->json([
                    'message' => 'Chaque section sélectionnée doit être active dans cette école.',
                ], 422);
            }

            $roleSlug = $this->roleSlugForSections($sections);
            $roleId = Role::query()->where('slug', $roleSlug)->value('id');
            $schoolUser->update(['role_id' => $roleId]);
            $sectionIds = $sections->pluck('id')->all();
            $schoolUser->sections()->sync($sectionIds);
        }

        return response()->json($schoolUser->fresh()->load('user', 'role', 'sections'), 200);
    }

    private function roleSlugForSections($sections): string
    {
        $isPrimary = $sections->every(
            fn($section) => mb_strtolower(trim($section->name)) === 'primaire'
        );
        $isSecondary = $sections->every(
            fn($section) => mb_strtolower(trim($section->name)) !== 'primaire'
        );

        if ($isPrimary) {
            return 'enseignant';
        }

        if ($isSecondary) {
            return 'professeur';
        }

        abort(422, 'Un compte ne peut pas mélanger une section primaire et une section secondaire.');
    }

    public function destroy(Request $request, School $school, SchoolUser $schoolUser)
    {
        $this->authorizeDirecteur($request, $school);

        // Vérifier que le schoolUser appartient à l'école
        if ($schoolUser->school_id !== $school->id) {
            return response()->json(['message' => 'Professeur non trouvé'], 404);
        }

        $schoolUser->delete(); // Soft delete

        $this->syncStaffQuota($school->fresh());

        return response()->json(['message' => 'Professeur supprimé'], 200);
    }
}
