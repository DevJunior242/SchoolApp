<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Api\Concerns\AuthorizesSchoolDirecteur;
use App\Http\Controllers\Api\Concerns\GeneratesSeasons;
use App\Http\Controllers\Controller;
use App\Models\School;
use App\Models\SchoolYear;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class SchoolYearController extends Controller
{
    use AuthorizesSchoolDirecteur, GeneratesSeasons;

    /**
     * Toutes les années scolaires de l'école (la plus récente en premier),
     * avec leurs trimestres/semestres — sert à afficher l'année en cours et
     * l'historique dans l'écran "Année scolaire".
     */
    public function index(Request $request, School $school)
    {
        return response()->json(
            $school->schoolYears()
                ->with(['seasons' => fn ($query) => $query->orderBy('order')])
                ->orderByDesc('start_date')
                ->get()
        );
    }

    /**
     * Démarre une nouvelle année scolaire (rentrée suivante) : ne migre ni
     * les classes ni les élèves, le directeur les recrée pour la nouvelle
     * année comme pour une école qui démarre — seule l'année "en cours"
     * change, ce qui détermine où les nouvelles classes sont rattachées.
     */
    public function store(Request $request, School $school)
    {
        $this->authorizeDirecteur($request, $school);

        $now = Carbon::now();
        $startYear = $now->month >= 9 ? $now->year : $now->year - 1;
        $label = "{$startYear}-".($startYear + 1);

        if ($school->schoolYears()->where('label', $label)->exists()) {
            throw ValidationException::withMessages([
                'label' => ["L'année scolaire {$label} existe déjà."],
            ]);
        }

        $schoolYear = DB::transaction(function () use ($school, $startYear, $label) {
            $school->schoolYears()->where('is_current', true)->update(['is_current' => false]);

            $schoolYear = SchoolYear::query()->create([
                'school_id' => $school->id,
                'label' => $label,
                'start_date' => Carbon::create($startYear, 9, 1),
                'end_date' => Carbon::create($startYear + 1, 6, 30),
                'is_current' => true,
            ]);

            $this->createSeasonsForYear($school, $schoolYear, $school->academic_period_type);

            return $schoolYear;
        });

        return response()->json($schoolYear->load('seasons'), 201);
    }
}
