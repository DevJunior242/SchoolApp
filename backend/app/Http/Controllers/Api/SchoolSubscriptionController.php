<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\PaymentMethod;
use App\Models\School;
use App\Models\SchoolPricingPlan;
use App\Models\SchoolSubscription;
use App\Models\SchoolSubscriptionPayment;
use App\Models\SchoolUser;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class SchoolSubscriptionController extends Controller
{
    public function current(Request $request, School $school)
    {
        $this->authorizeDirector($request, $school);

        return response()->json(SchoolSubscription::query()->where('school_id', $school->id)->with(['plan', 'payments.paymentMethod'])->latest()->first());
    }

    public function store(Request $request, School $school)
    {
        $this->authorizeDirector($request, $school);
        $data = $request->validate([
            'school_pricing_plan_id' => ['required', 'uuid', 'exists:school_pricing_plans,id'],
            'billing_cycle' => ['required', 'in:monthly,annual'],
        ]);
        $plan = SchoolPricingPlan::query()->where('active', true)->findOrFail($data['school_pricing_plan_id']);
        $amount = $data['billing_cycle'] === 'annual' ? $plan->annual_amount : $plan->monthly_amount;
        if ($data['billing_cycle'] === 'monthly' && ! $plan->monthly_enabled || $data['billing_cycle'] === 'annual' && ! $plan->annual_enabled) {
            throw ValidationException::withMessages(['billing_cycle' => ['Cette périodicité n’est pas disponible pour ce tarif.']]);
        }
        SchoolSubscription::query()->where('school_id', $school->id)->whereIn('status', [SchoolSubscription::STATUS_PENDING_PAYMENT, SchoolSubscription::STATUS_PAID])->update(['status' => SchoolSubscription::STATUS_CANCELLED]);

        return response()->json(SchoolSubscription::query()->create([
            'school_id' => $school->id,
            'school_pricing_plan_id' => $plan->id,
            'created_by' => $request->user()->id,
            'billing_cycle' => $data['billing_cycle'],
            'amount' => $amount,
            'currency' => $plan->currency,
            'status' => SchoolSubscription::STATUS_PENDING_PAYMENT,
        ])->load('plan'), 201);
    }

    public function declarePayment(Request $request, SchoolSubscription $subscription)
    {
        $this->authorizeDirector($request, $subscription->school);
        $data = $request->validate([
            'payment_method_id' => ['required', 'uuid', 'exists:payment_methods,id'],
            'sender_number' => ['required', 'string', 'max:50'],
            'transaction_id' => ['nullable', 'string', 'max:120'],
        ]);
        abort_if($subscription->status !== SchoolSubscription::STATUS_PENDING_PAYMENT, 422, 'Cet abonnement n’attend pas de paiement.');
        $method = PaymentMethod::query()->whereNull('school_id')->where('is_active', true)->findOrFail($data['payment_method_id']);
        $payment = $subscription->payments()->create([...$data, 'payment_method_id' => $method->id, 'status' => SchoolSubscriptionPayment::STATUS_DECLARED]);

        return response()->json($payment->load('paymentMethod', 'subscription.plan'), 201);
    }

    public function pendingPayments()
    {
        return response()->json(SchoolSubscriptionPayment::query()->where('status', SchoolSubscriptionPayment::STATUS_DECLARED)->with(['subscription.school', 'subscription.plan', 'paymentMethod'])->latest()->get());
    }

    public function confirm(Request $request, SchoolSubscriptionPayment $payment)
    {
        return $this->review($request, $payment, true);
    }

    public function reject(Request $request, SchoolSubscriptionPayment $payment)
    {
        return $this->review($request, $payment, false);
    }

    private function review(Request $request, SchoolSubscriptionPayment $payment, bool $confirmed)
    {
        abort_if($payment->status !== SchoolSubscriptionPayment::STATUS_DECLARED, 422, 'Ce paiement a déjà été traité.');
        DB::transaction(function () use ($request, $payment, $confirmed) {
            $payment->update(['status' => $confirmed ? SchoolSubscriptionPayment::STATUS_CONFIRMED : SchoolSubscriptionPayment::STATUS_REJECTED, 'reviewed_by' => $request->user()->id, 'reviewed_at' => now()]);
            if ($confirmed) {
                $subscription = $payment->subscription()->lockForUpdate()->first();
                $subscription->update(['status' => SchoolSubscription::STATUS_PAID, 'starts_at' => now(), 'ends_at' => $subscription->billing_cycle === 'annual' ? now()->addYear() : now()->addMonth()]);
                $subscription->school->update(['pricing_plan_id' => $subscription->school_pricing_plan_id, 'plan' => $subscription->plan->slug, 'status' => School::STATUS_ACTIVE, 'trial_ends_at' => null, 'staff_quota_deadline_at' => null, 'staff_quota_reminder_sent_at' => null]);
            }
        });

        return response()->json($payment->fresh()->load(['subscription.school', 'subscription.plan', 'paymentMethod']));
    }

    private function authorizeDirector(Request $request, School $school): void
    {
        abort_unless(SchoolUser::query()->where('school_id', $school->id)->where('user_id', $request->user()->id)->whereHas('role', fn ($q) => $q->where('slug', 'directeur'))->exists(), 403, 'Seul le directeur peut gérer l’abonnement.');
    }
}
