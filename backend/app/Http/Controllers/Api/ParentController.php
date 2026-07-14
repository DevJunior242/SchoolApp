<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Api\Concerns\AuthorizesSchoolDirecteur;
use App\Http\Controllers\Controller;
use App\Models\ClassStudent;
use App\Models\School;
use App\Models\SchoolUser;
use App\Models\User;
use Illuminate\Http\Request;

class ParentController extends Controller
{
    use AuthorizesSchoolDirecteur;

    public function index(Request $request, School $school)
    {
        $this->authorizeDirecteur($request, $school);

        return response()->json(
            SchoolUser::query()
                ->where('school_id', $school->id)
                ->whereHas('role', fn ($query) => $query->where('slug', 'parent'))
                ->when(
                    $request->query('search'),
                    fn ($query, $search) => $query->whereHas('user', fn ($q) => $q->where('fullname', 'like', "%{$search}%"))
                )
                ->with(['user', 'role'])
                ->paginate($request->integer('per_page', 10))
        );
    }

    /**
     * Vue "mes enfants" pour un parent connecté (pas besoin d'être directeur,
     * il consulte ses propres enfants).
     */
    public function mine(Request $request, School $school)
    {
        $belongs = SchoolUser::query()
            ->where('school_id', $school->id)
            ->where('user_id', $request->user()->id)
            ->exists();

        abort_unless($belongs, 403, "Vous n'appartenez pas à cette école.");

        return $this->childrenOf($request->user(), $school);
    }

    public function children(Request $request, School $school, User $parent)
    {
        $this->authorizeDirecteur($request, $school);

        return $this->childrenOf($parent, $school);
    }

    private function childrenOf(User $parent, School $school)
    {
        $children = $parent->childStudents()
            ->whereHas('schoolStudents', fn ($query) => $query->where('school_id', $school->id))
            ->with([
                'schoolStudents' => fn ($query) => $query->where('school_id', $school->id),
                'classStudents' => fn ($query) => $query
                    ->where('status', ClassStudent::STATUS_ACTIVE)
                    ->latest('created_at')
                    ->limit(1)
                    ->with('schoolClass'),
            ])
            ->get();

        return response()->json($children);
    }
}
