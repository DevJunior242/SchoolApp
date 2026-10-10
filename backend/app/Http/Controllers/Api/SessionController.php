<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\Auth\SessionService;
use Illuminate\Http\Request;

/**
 * « Appareils connectés » (page Sécurité) : voir ses sessions ouvertes,
 * déconnecter un appareil inconnu ou tous les autres d'un coup.
 */
class SessionController extends Controller
{
    public function __construct(private readonly SessionService $sessions) {}

    public function index(Request $request)
    {
        $user = $request->user();

        return response()->json([
            'sessions' => $this->sessions->list($user, (string) $user->currentAccessToken()?->id),
            'idle_days' => SessionService::IDLE_DAYS,
        ]);
    }

    public function destroy(Request $request, string $session)
    {
        // Seulement ses propres jetons : l'identifiant d'un autre compte donne 404.
        $token = $request->user()->tokens()->whereKey($session)->firstOrFail();
        $token->delete();

        return response()->json(['message' => 'Appareil déconnecté.']);
    }

    public function destroyOthers(Request $request)
    {
        $user = $request->user();
        $count = $user->tokens()->whereKeyNot($user->currentAccessToken()?->id)->delete();

        return response()->json([
            'message' => $count > 0 ? 'Tous les autres appareils ont été déconnectés.' : 'Aucun autre appareil n’était connecté.',
            'count' => $count,
        ]);
    }
}
