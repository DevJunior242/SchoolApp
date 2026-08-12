<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\MarketplacePlan;
use Illuminate\Http\Request;

class MarketplacePlanController extends Controller
{
    /**
     * Vue prestataire : les formules actives parmi lesquelles choisir au
     * moment de signaler un paiement. `type` filtre entre abonnement
     * annuaire (défaut) et boost produit.
     */
    public function index(Request $request)
    {
        return response()->json(
            MarketplacePlan::query()
                ->where('active', true)
                ->where('type', $request->integer('type', MarketplacePlan::TYPE_SUBSCRIPTION))
                ->orderBy('period')
                ->orderBy('duration_days')
                ->get()
        );
    }

    public function adminIndex()
    {
        return response()->json(MarketplacePlan::query()->orderBy('type')->orderBy('period')->get());
    }

    public function adminStore(Request $request)
    {
        $validated = $request->validate([
            'type' => ['required', 'integer', 'in:'.MarketplacePlan::TYPE_SUBSCRIPTION.','.MarketplacePlan::TYPE_BOOST],
            'period' => ['required_if:type,'.MarketplacePlan::TYPE_SUBSCRIPTION, 'nullable', 'integer', 'in:'.MarketplacePlan::PERIOD_MONTHLY.','.MarketplacePlan::PERIOD_ANNUAL],
            'duration_days' => ['required_if:type,'.MarketplacePlan::TYPE_BOOST, 'nullable', 'integer', 'min:1'],
            'amount' => ['required', 'numeric', 'min:0'],
            'currency' => ['nullable', 'string', 'max:20'],
        ]);

        // period reste NOT NULL en base même pour un boost (où il n'est pas
        // utilisé) : une valeur par défaut évite d'exiger un choix
        // dénué de sens côté superadmin.
        $validated['period'] ??= MarketplacePlan::PERIOD_MONTHLY;

        $plan = MarketplacePlan::query()->create($validated);

        return response()->json($plan, 201);
    }

    public function adminUpdate(Request $request, MarketplacePlan $plan)
    {
        $validated = $request->validate([
            'amount' => ['sometimes', 'numeric', 'min:0'],
            'currency' => ['nullable', 'string', 'max:20'],
            'duration_days' => ['sometimes', 'nullable', 'integer', 'min:1'],
            'active' => ['sometimes', 'boolean'],
        ]);

        $plan->update($validated);

        return response()->json($plan);
    }

    public function adminDestroy(MarketplacePlan $plan)
    {
        $plan->delete();

        return response()->json(status: 204);
    }
}
