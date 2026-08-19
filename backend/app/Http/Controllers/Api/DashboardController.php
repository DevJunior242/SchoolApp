<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Api\Concerns\AuthorizesSchoolDirecteur;
use App\Http\Controllers\Controller;
use App\Models\School;
use App\Services\SchoolSummaryService;
use App\Services\StudentRiskService;
use Illuminate\Http\Request;

class DashboardController extends Controller
{
    use AuthorizesSchoolDirecteur;

    private const STAFF_ROLE_SLUGS = ['directeur', 'censeur', 'surveillant', 'secretaire', 'comptable'];

    /**
     * Chiffres clés + actions en attente pour le tableau de bord du
     * personnel (directeur, censeur, surveillant, secrétariat, comptable).
     */
    public function summary(Request $request, School $school, SchoolSummaryService $summaryService)
    {
        $this->authorizeRoles($request, $school, self::STAFF_ROLE_SLUGS, "Vous n'avez pas accès à ce résumé.");

        return response()->json([
            ...$summaryService->summary($school),
            'recent_activity' => $summaryService->recentActivity($school),
            'monthly_trend' => $summaryService->monthlyTrend($school),
        ]);
    }

    /**
     * Résumé pour un élève avec son propre compte : uniquement des chiffres
     * généraux sur l'école (effectifs, jamais de montant/paiement d'un
     * autre élève) et ses propres statistiques scolaires — pas le résumé
     * du personnel, qui contient des données financières et l'activité de
     * toute l'école.
     */
    public function studentSummary(Request $request, School $school, SchoolSummaryService $summaryService, StudentRiskService $riskService)
    {
        $student = $request->user()->studentProfile;
        abort_unless($student, 404, "Aucune fiche élève associée à ce compte.");

        $schoolSummary = $summaryService->summary($school);
        $myScore = $riskService->scoreFor($school, $student);

        return response()->json([
            'school' => [
                'students_count' => $schoolSummary['students_count'],
                'teachers_count' => $schoolSummary['teachers_count'],
                'classes_count' => $schoolSummary['classes_count'],
            ],
            'me' => [
                'average' => $myScore['average'],
                'absences' => $myScore['absences'],
                'retards' => $myScore['retards'],
            ],
        ]);
    }
}
