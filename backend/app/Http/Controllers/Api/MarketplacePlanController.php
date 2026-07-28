<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\MarketplacePlan;
use Illuminate\Http\Request;

class MarketplacePlanController extends Controller
{
    /**
     * Vue prestataire : les formules actives parmi lesquelles choisir au
     * moment de signaler un paiement.
     */
    public function index()
    {
        return response()->json(
            MarketplacePlan::query()->where('active', true)->orderBy('period')->get()
        );
    }

    public function adminIndex()
    {
        return response()->json(MarketplacePlan::query()->orderBy('period')->get());
    }

    public function adminStore(Request $request)
    {
        $validated = $request->validate([
            'period' => ['required', 'integer', 'in:'.MarketplacePlan::PERIOD_MONTHLY.','.MarketplacePlan::PERIOD_ANNUAL],
            'amount' => ['required', 'numeric', 'min:0'],
            'currency' => ['nullable', 'string', 'max:20'],
        ]);

        $plan = MarketplacePlan::query()->create($validated);

        return response()->json($plan, 201);
    }

    public function adminUpdate(Request $request, MarketplacePlan $plan)
    {
        $validated = $request->validate([
            'amount' => ['sometimes', 'numeric', 'min:0'],
            'currency' => ['nullable', 'string', 'max:20'],
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
