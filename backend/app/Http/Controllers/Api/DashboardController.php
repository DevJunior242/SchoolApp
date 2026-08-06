<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Api\Concerns\AuthorizesSchoolDirecteur;
use App\Http\Controllers\Controller;
use App\Models\School;
use App\Services\SchoolSummaryService;
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
        ]);
    }
}
