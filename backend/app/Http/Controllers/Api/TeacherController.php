<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Api\Concerns\AuthorizesSchoolDirecteur;
use App\Http\Controllers\Api\Concerns\ResolvesMemberUser;
use App\Http\Controllers\Controller;
use App\Models\Role;
use App\Models\School;
use App\Models\SchoolUser;
use Illuminate\Http\Request;

class TeacherController extends Controller
{
    use AuthorizesSchoolDirecteur, ResolvesMemberUser;

    public function index(Request $request, School $school)
    {
        $this->authorizeDirecteur($request, $school);

        return response()->json(
            SchoolUser::query()
                ->where('school_id', $school->id)
                ->whereHas('role', fn ($query) => $query->where('slug', 'professeur'))
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
        ]);

        $professeurRole = Role::query()->where('slug', 'professeur')->firstOrFail();
        $user = $this->resolveUser($validated);

        $schoolUser = SchoolUser::query()->updateOrCreate(
            [
                'school_id' => $school->id,
                'user_id' => $user->id,
            ],
            [
                'role_id' => $professeurRole->id,
                'status' => SchoolUser::STATUS_ACTIVE,
            ]
        );

        // Ne bascule l'école active que si le prof n'en a pas encore une
        // (on n'écrase pas le contexte d'un prof déjà actif ailleurs).
        if (! $user->current_school_id) {
            $user->update(['current_school_id' => $school->id]);
        }

        return response()->json($schoolUser->load('user', 'role'), 201);
    }
}
