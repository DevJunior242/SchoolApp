<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Api\Concerns\AuthorizesSchoolDirecteur;
use App\Http\Controllers\Controller;
use App\Models\School;
use App\Models\Season;
use Illuminate\Http\Request;

class SeasonController extends Controller
{
    use AuthorizesSchoolDirecteur;

    /**
     * Trimestres/semestres de l'année scolaire en cours, pour les sélecteurs
     * de saison côté saisie de notes et bulletin. L'appartenance à l'école
     * est déjà garantie par le middleware school.member.
     */
    public function index(Request $request, School $school)
    {
        $currentYear = $school->schoolYears()->where('is_current', true)->first();

        if (! $currentYear) {
            return response()->json([]);
        }

        return response()->json($currentYear->seasons()->orderBy('order')->get());
    }

    /**
     * Les dates générées automatiquement (Sept-Déc, Jan-Mars, Avr-Juin...)
     * sont une approximation : chaque école ajuste le libellé et les dates
     * réelles de ses trimestres/semestres selon son propre calendrier.
     */
    public function update(Request $request, School $school, Season $season)
    {
        $this->authorizeDirecteur($request, $school);

        abort_if($season->school_id !== $school->id, 404);

        $validated = $request->validate([
            'label' => ['required', 'string', 'max:255'],
            'start_date' => ['required', 'date'],
            'end_date' => ['required', 'date', 'after:start_date'],
        ]);

        $season->update($validated);

        return response()->json($season);
    }
}
