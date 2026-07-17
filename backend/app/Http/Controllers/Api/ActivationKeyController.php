<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ActivationKey;
use Illuminate\Http\Request;

class ActivationKeyController extends Controller
{
    /**
     * Liste des clés générées par la plateforme (réservé au superadmin).
     */
    public function index(Request $request)
    {
        return response()->json(
            ActivationKey::query()
                ->with(['creator', 'school'])
                ->latest('created_at')
                ->paginate($request->integer('per_page', 20))
        );
    }

    /**
     * Génère une nouvelle clé d'activation, à transmettre à un futur client.
     */
    public function generate(Request $request)
    {
        $key = ActivationKey::generate($request->user()->id);

        return response()->json($key->load('creator'), 201);
    }

    /**
     * Vérifie qu'une clé existe et est encore disponible, sans la
     * consommer — utilisé à l'étape 1 du formulaire de création d'école.
     */
    public function validateKey(Request $request)
    {
        $validated = $request->validate([
            'key' => ['required', 'string'],
        ]);

        $activationKey = ActivationKey::query()->where('key', $validated['key'])->first();

        if (! $activationKey || $activationKey->status !== ActivationKey::STATUS_DISPONIBLE) {
            return response()->json(['message' => "Cette clé d'activation est invalide ou déjà utilisée."], 422);
        }

        return response()->json(['valid' => true]);
    }
}
