<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Role;
use App\Models\School;
use App\Models\SchoolUser;
use App\Models\SchoolYear;
use App\Models\Season;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

class SchoolController extends Controller
{
    public function index()
    {
        return response()->json(
            School::query()
                ->where('status', School::STATUS_ACTIVE)
                ->with('country')
                ->get()
        );
    }

    public function mine(Request $request)
    {
        return response()->json(
            SchoolUser::query()
                ->where('user_id', $request->user()->id)
                ->with(['school.country', 'role'])
                ->get()
        );
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'country_id' => ['required', 'uuid', 'exists:countries,id'],
            'address' => ['nullable', 'string', 'max:255'],
            'phone' => ['nullable', 'string', 'max:30'],
            'email' => ['nullable', 'email', 'max:255'],
        ]);

        $user = $request->user();
        $directeurRole = Role::query()->where('slug', 'directeur')->firstOrFail();

        $school = DB::transaction(function () use ($validated, $user, $directeurRole) {
            $school = School::query()->create([
                ...$validated,
                'status' => School::STATUS_ACTIVE,
            ]);

            SchoolUser::query()->create([
                'school_id' => $school->id,
                'user_id' => $user->id,
                'role_id' => $directeurRole->id,
                'status' => SchoolUser::STATUS_ACTIVE,
            ]);

            $user->update(['current_school_id' => $school->id]);

            $this->createDefaultSchoolYear($school);

            return $school;
        });

        return response()->json($school->load('country'), 201);
    }

    public function switchTo(Request $request, School $school)
    {
        $belongs = $request->user()->schools()->where('schools.id', $school->id)->exists();

        if (! $belongs) {
            return response()->json(['message' => "Vous n'appartenez pas à cette école."], 403);
        }

        $request->user()->update(['current_school_id' => $school->id]);

        return response()->json($school->load('country'));
    }

    public function join(Request $request, School $school)
    {
        $validated = $request->validate([
            'role_id' => ['required', 'uuid', 'exists:roles,id'],
        ]);

        $schoolUser = SchoolUser::query()->updateOrCreate(
            [
                'school_id' => $school->id,
                'user_id' => $request->user()->id,
            ],
            [
                'role_id' => $validated['role_id'],
                'status' => SchoolUser::STATUS_ACTIVE,
            ]
        );

        return response()->json($schoolUser->load('role', 'school'));
    }

    /**
     * La rentrée africaine se situe généralement en septembre : avant cette
     * date on considère qu'on est encore dans l'année scolaire précédente.
     */
    private function createDefaultSchoolYear(School $school): void
    {
        $now = Carbon::now();
        $startYear = $now->month >= 9 ? $now->year : $now->year - 1;

        $schoolYear = SchoolYear::query()->create([
            'school_id' => $school->id,
            'label' => "{$startYear}-".($startYear + 1),
            'start_date' => Carbon::create($startYear, 9, 1),
            'end_date' => Carbon::create($startYear + 1, 6, 30),
            'is_current' => true,
        ]);

        Season::query()->create([
            'school_id' => $school->id,
            'school_year_id' => $schoolYear->id,
            'type' => Season::TYPE_TRIMESTRE,
            'label' => 'Trimestre 1',
            'order' => 1,
        ]);
    }
}
