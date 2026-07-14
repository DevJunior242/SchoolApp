<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Api\Concerns\AuthorizesSchoolDirecteur;
use App\Http\Controllers\Api\Concerns\ResolvesMemberUser;
use App\Http\Controllers\Controller;
use App\Models\Role;
use App\Models\School;
use App\Models\SchoolUser;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

class SchoolMemberController extends Controller
{
    use AuthorizesSchoolDirecteur, ResolvesMemberUser;

    /**
     * Rôles non attribuables via l'ajout de membre générique : le directeur est
     * unique (désigné à la création de l'école), parent/élève arrivent via
     * l'inscription des élèves (pivot class_user), et professeur a sa propre
     * page/flux dédié (Professeurs).
     */
    private const RESTRICTED_ROLE_SLUGS = ['directeur', 'parent', 'eleve', 'professeur'];

    /**
     * Parent et élève ne sont pas des "membres" de l'école au sens
     * classique : ils apparaissent via l'inscription des élèves, pas ici.
     */
    private const HIDDEN_FROM_LIST_ROLE_SLUGS = ['parent', 'eleve'];

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

        if (! $user->current_school_id) {
            $user->update(['current_school_id' => $school->id]);
        }

        return response()->json($schoolUser->load('user', 'role'), 201);
    }
}
