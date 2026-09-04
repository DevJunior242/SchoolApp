<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class SchoolSubscription extends Model
{
    use HasUuids;

    const STATUS_PENDING_PAYMENT = 'pending_payment';

    const STATUS_PAID = 'paid';

    const STATUS_REJECTED = 'rejected';

    const STATUS_CANCELLED = 'cancelled';

    protected $fillable = [
        'school_id',
        'school_pricing_plan_id',
        'billing_cycle',
        'amount',
        'currency',
        'status',
        'starts_at',
        'ends_at',
        'created_by',
    ];

    protected function casts(): array
    {
        return ['amount' => 'decimal:2', 'starts_at' => 'datetime', 'ends_at' => 'datetime'];
    }

    public function school(): BelongsTo
    {
        return $this->belongsTo(School::class);
    }

    public function plan(): BelongsTo
    {
        return $this->belongsTo(SchoolPricingPlan::class, 'school_pricing_plan_id');
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function payments(): HasMany
    {
        return $this->hasMany(SchoolSubscriptionPayment::class);
    }
}
