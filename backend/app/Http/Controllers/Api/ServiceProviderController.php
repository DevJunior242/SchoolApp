<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\MarketplacePlan;
use App\Models\Role;
use App\Models\School;
use App\Models\ServiceProvider;
use App\Models\ServiceProviderPayment;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

class ServiceProviderController extends Controller
{
    /**
     * L'utilisateur doit déjà avoir un compte (email vérifié) : devenir
     * prestataire attribue le rôle global "prestataire", comme le
     * superadmin, indépendant de toute école.
     */
    public function store(Request $request)
    {
        $user = $request->user();
        abort_if($user->serviceProvider, 422, 'Vous avez déjà une fiche prestataire.');

        // Le prestataire est un rôle global (users.role_id), comme le
        // superadmin : l'attribuer à un compte déjà membre d'une école
        // écraserait son rôle scolaire dans toute la navigation (vécu en
        // conditions réelles — un bibliothécaire a perdu l'accès à sa
        // bibliothèque en devenant prestataire avec le même compte).
        abort_if(
            $user->role_id || $user->schools()->exists(),
            422,
            'Ce compte est déjà rattaché à un rôle (école ou administration) : utilisez un compte différent pour devenir prestataire.'
        );

        $validated = $request->validate([
            'category' => ['required', 'integer', 'in:'.implode(',', [
                ServiceProvider::CATEGORY_ENSEIGNANT,
                ServiceProvider::CATEGORY_FORMATEUR,
                ServiceProvider::CATEGORY_CHAUFFEUR,
                ServiceProvider::CATEGORY_FOURNISSEUR,
                ServiceProvider::CATEGORY_IMPRIMEUR,
                ServiceProvider::CATEGORY_LIBRAIRIE,
            ])],
            'business_name' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string', 'max:1000'],
            'country_id' => ['required', 'uuid', 'exists:countries,id'],
            'city' => ['nullable', 'string', 'max:255'],
            'phone' => ['nullable', 'string', 'max:30'],
            'email' => ['nullable', 'email', 'max:255'],
        ]);

        if (empty($validated['phone']) && empty($validated['email'])) {
            throw ValidationException::withMessages([
                'phone' => ['Indiquez au moins un numéro de téléphone ou un email pour être recontacté.'],
            ]);
        }

        $provider = ServiceProvider::query()->create([
            ...$validated,
            'user_id' => $user->id,
            'status' => ServiceProvider::STATUS_PENDING,
        ]);

        $prestataireRoleId = Role::query()->where('slug', 'prestataire')->value('id');
        $user->update(['role_id' => $prestataireRoleId]);

        return response()->json($provider, 201);
    }

    /**
     * Tableau de bord du prestataire : sa fiche, ses articles, son
     * historique de paiements.
     */
    public function myProfile(Request $request)
    {
        $provider = $request->user()->serviceProvider;
        abort_unless($provider, 404);

        return response()->json($provider->load('country', 'items', 'payments.plan', 'payments.paymentMethod'));
    }

    public function updateProfile(Request $request)
    {
        $provider = $request->user()->serviceProvider;
        abort_unless($provider, 404);

        $validated = $request->validate([
            'business_name' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string', 'max:1000'],
            'city' => ['nullable', 'string', 'max:255'],
            'phone' => ['nullable', 'string', 'max:30'],
            'email' => ['nullable', 'email', 'max:255'],
        ]);

        if (empty($validated['phone']) && empty($validated['email'])) {
            throw ValidationException::withMessages([
                'phone' => ['Indiquez au moins un numéro de téléphone ou un email pour être recontacté.'],
            ]);
        }

        $provider->update($validated);

        return response()->json($provider->load('country', 'items', 'payments'));
    }

    /**
     * Le prestataire signale un paiement effectué en dehors de la
     * plateforme (Mobile Money, virement...) : même principe déclaratif que
     * les paiements de scolarité, en attente de confirmation superadmin.
     * Le montant vient de la formule choisie (mensuelle/annuelle), jamais
     * du client, pour ne pas pouvoir déclarer un montant arbitraire.
     */
    public function reportPayment(Request $request)
    {
        $provider = $request->user()->serviceProvider;
        abort_unless($provider, 404);

        $validated = $request->validate([
            'marketplace_plan_id' => ['required', 'uuid', 'exists:marketplace_plans,id'],
            'payment_method_id' => ['nullable', 'uuid', 'exists:payment_methods,id'],
            'reference' => ['nullable', 'string', 'max:255'],
        ]);

        $plan = MarketplacePlan::query()->findOrFail($validated['marketplace_plan_id']);
        abort_unless($plan->active, 422, "Cette formule n'est plus disponible.");

        $payment = $provider->payments()->create([
            'marketplace_plan_id' => $plan->id,
            'payment_method_id' => $validated['payment_method_id'] ?? null,
            'amount' => $plan->amount,
            'reference' => $validated['reference'] ?? null,
            'status' => ServiceProviderPayment::STATUS_PENDING,
        ]);

        return response()->json($payment->load('plan', 'paymentMethod'), 201);
    }

    /**
     * Vue école : annuaire des prestataires approuvés ET à jour de
     * cotisation, filtré par pays par défaut sur celui de l'école (un
     * chauffeur à Ouagadougou n'intéresse pas une école à Abidjan). Ouvert
     * à tout membre de l'école, y compris parents/élèves, qui peuvent
     * vouloir acheter directement (librairie, fournitures).
     */
    public function index(Request $request, School $school)
    {
        return response()->json(
            ServiceProvider::query()
                ->where('status', ServiceProvider::STATUS_APPROVED)
                ->whereNotNull('subscription_expires_at')
                ->whereDate('subscription_expires_at', '>=', now()->toDateString())
                ->where('country_id', $request->query('country_id', $school->country_id))
                ->when($request->query('category'), fn ($query, $category) => $query->where('category', $category))
                ->when(
                    $request->query('city'),
                    fn ($query, $city) => $query->where('city', 'like', "%{$city}%")
                )
                ->with('items')
                ->orderBy('business_name')
                ->paginate($request->integer('per_page', 20))
        );
    }

    /**
     * Vue superadmin : modération des fiches (en attente par défaut).
     */
    public function adminIndex(Request $request)
    {
        return response()->json(
            ServiceProvider::query()
                ->where('status', $request->integer('status', ServiceProvider::STATUS_PENDING))
                ->with('country')
                ->orderByDesc('created_at')
                ->paginate($request->integer('per_page', 20))
        );
    }

    public function approve(ServiceProvider $provider)
    {
        $provider->update(['status' => ServiceProvider::STATUS_APPROVED]);

        return response()->json($provider);
    }

    public function reject(ServiceProvider $provider)
    {
        $provider->update(['status' => ServiceProvider::STATUS_REJECTED]);

        return response()->json($provider);
    }

    /**
     * Vue superadmin : paiements signalés en attente de confirmation.
     */
    public function adminPaymentsIndex(Request $request)
    {
        return response()->json(
            ServiceProviderPayment::query()
                ->where('status', $request->integer('status', ServiceProviderPayment::STATUS_PENDING))
                ->with('serviceProvider')
                ->orderByDesc('created_at')
                ->paginate($request->integer('per_page', 20))
        );
    }

    /**
     * Confirmer prolonge l'abonnement d'un mois (formule mensuelle) ou d'un
     * an (formule annuelle) à partir d'aujourd'hui, ou à partir de la date
     * d'expiration actuelle si l'abonnement est encore actif (renouvellement
     * anticipé sans perdre de jours déjà payés). Un paiement sans formule
     * (ancienne donnée avant l'introduction des formules) prolonge d'un mois
     * par défaut.
     */
    public function confirmPayment(Request $request, ServiceProviderPayment $payment)
    {
        abort_unless($payment->status === ServiceProviderPayment::STATUS_PENDING, 422, 'Ce paiement a déjà été traité.');

        $payment->update([
            'status' => ServiceProviderPayment::STATUS_CONFIRMED,
            'confirmed_by' => $request->user()->id,
            'confirmed_at' => now(),
        ]);

        $provider = $payment->serviceProvider;
        $base = $provider->hasActiveSubscription() ? $provider->subscription_expires_at : now();
        $months = $payment->plan?->period === MarketplacePlan::PERIOD_ANNUAL ? 12 : 1;
        $provider->update(['subscription_expires_at' => $base->copy()->addMonths($months)]);

        return response()->json($payment->load('serviceProvider'));
    }

    public function rejectPayment(Request $request, ServiceProviderPayment $payment)
    {
        abort_unless($payment->status === ServiceProviderPayment::STATUS_PENDING, 422, 'Ce paiement a déjà été traité.');

        $payment->update([
            'status' => ServiceProviderPayment::STATUS_REJECTED,
            'confirmed_by' => $request->user()->id,
            'confirmed_at' => now(),
        ]);

        return response()->json($payment);
    }
}
