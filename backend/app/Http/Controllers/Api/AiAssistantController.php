<?php

namespace App\Http\Controllers\Api;

use App\Exceptions\AiNotConfiguredException;
use App\Http\Controllers\Api\Concerns\AuthorizesSchoolDirecteur;
use App\Http\Controllers\Controller;
use App\Models\School;
use App\Services\Ai\ParentAssistantService;
use App\Services\Ai\SchoolAssistantService;
use App\Services\StudentRiskService;
use Illuminate\Http\Request;
use Throwable;

class AiAssistantController extends Controller
{
    use AuthorizesSchoolDirecteur;

    public function riskReport(Request $request, School $school, StudentRiskService $riskService)
    {
        $this->authorizeDirecteur($request, $school);

        return response()->json(['students' => $riskService->reportForSchool($school)->values()]);
    }

    public function ask(Request $request, School $school, SchoolAssistantService $assistant)
    {
        $this->authorizeDirecteur($request, $school);

        $validated = $request->validate([
            'question' => ['required', 'string', 'max:500'],
        ]);

        try {
            $answer = $assistant->ask($school, $validated['question']);
        } catch (AiNotConfiguredException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        } catch (Throwable $e) {
            // Erreurs du fournisseur IA (limite de débit, panne, quota
            // dépassé...) : jamais de trace brute renvoyée au client, un
            // message actionnable à la place.
            report($e);

            return response()->json([
                'message' => "L'assistant IA est momentanément indisponible (quota ou limite de débit atteinte). Réessayez dans quelques instants.",
            ], 503);
        }

        return response()->json(['answer' => $answer]);
    }

    /**
     * Pas d'authorizeDirecteur ici : n'importe quel membre de l'école peut
     * appeler cette route, mais ParentAssistantService ne cherche et ne
     * renvoie jamais que les données des enfants réellement rattachés à
     * l'utilisateur connecté (voir ParentAssistantService::children).
     */
    public function askAsParent(Request $request, School $school, ParentAssistantService $assistant)
    {
        $validated = $request->validate([
            'question' => ['required', 'string', 'max:500'],
        ]);

        try {
            $answer = $assistant->ask($request->user(), $school, $validated['question']);
        } catch (AiNotConfiguredException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        } catch (Throwable $e) {
            report($e);

            return response()->json([
                'message' => "L'assistant IA est momentanément indisponible (quota ou limite de débit atteinte). Réessayez dans quelques instants.",
            ], 503);
        }

        return response()->json(['answer' => $answer]);
    }
}
