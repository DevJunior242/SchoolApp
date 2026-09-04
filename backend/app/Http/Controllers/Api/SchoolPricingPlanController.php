<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\SchoolPricingPlan;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class SchoolPricingPlanController extends Controller
{
    public function index()
    {
        return response()->json(
            SchoolPricingPlan::query()->withCount('schools')->orderBy('monthly_amount')->get()
        );
    }

    public function publicIndex()
    {
        return response()->json(
            SchoolPricingPlan::query()->where('active', true)->orderBy('monthly_amount')->get()
        );
    }

    public function store(Request $request)
    {
        $validated = $this->validated($request);
        $this->ensureBillingOption($validated);
        $validated['annual_base_amount'] = $validated['annual_base_amount'] ?? null;
        $validated['slug'] = Str::slug($validated['name']);

        return response()->json(SchoolPricingPlan::query()->create($validated), 201);
    }

    public function update(Request $request, SchoolPricingPlan $schoolPricingPlan)
    {
        $validated = $this->validated($request);
        $this->ensureBillingOption($validated);
        $validated['annual_base_amount'] = $validated['annual_base_amount']
            ?? ($schoolPricingPlan->annual_base_amount ?? ((float) $schoolPricingPlan->monthly_amount * 12));
        $validated['slug'] = Str::slug($validated['name']);
        $schoolPricingPlan->update($validated);

        return response()->json($schoolPricingPlan->fresh()->loadCount('schools'));
    }

    public function destroy(SchoolPricingPlan $schoolPricingPlan)
    {
        if ($schoolPricingPlan->schools()->exists()) {
            throw ValidationException::withMessages([
                'plan' => ['Ce tarif est utilisé par une ou plusieurs écoles et ne peut pas être supprimé. Désactivez-le plutôt.'],
            ]);
        }

        $schoolPricingPlan->delete();

        return response()->noContent();
    }

    private function validated(Request $request): array
    {
        return $request->validate([
            'name' => ['required', 'string', 'max:100'],
            'monthly_amount' => ['required', 'numeric', 'min:0', 'max:999999999.99'],
            'annual_base_amount' => ['nullable', 'numeric', 'min:0', 'max:999999999.99'],
            'monthly_enabled' => ['required', 'boolean'],
            'annual_enabled' => ['required', 'boolean'],
            'annual_discount_enabled' => ['required', 'boolean'],
            'annual_discount_percentage' => ['required', 'numeric', 'min:0', 'max:100'],
            'currency' => ['required', 'string', 'max:10'],
            'max_staff_accounts' => ['nullable', 'integer', 'min:1', 'max:100000'],
            'modules' => ['required', 'array'],
            'modules.*' => ['string', 'max:50'],
            'active' => ['sometimes', 'boolean'],
        ]);
    }

    private function ensureBillingOption(array $validated): void
    {
        if ($validated['monthly_enabled'] === $validated['annual_enabled']) {
            throw ValidationException::withMessages([
                'billing' => ['Activez une seule périodicité : mensuelle ou annuelle.'],
            ]);
        }

        if (! $validated['annual_enabled'] && $validated['annual_discount_enabled']) {
            throw ValidationException::withMessages([
                'annual_discount_enabled' => ['La réduction annuelle nécessite le paiement annuel.'],
            ]);
        }

        if ($validated['annual_enabled'] && empty($validated['annual_base_amount'])) {
            throw ValidationException::withMessages([
                'annual_base_amount' => ['Indiquez le prix annuel de base.'],
            ]);
        }
    }
}
