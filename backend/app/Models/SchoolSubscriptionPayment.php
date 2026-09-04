<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SchoolSubscriptionPayment extends Model
{
    use HasUuids;

    const STATUS_DECLARED = 'declared';

    const STATUS_CONFIRMED = 'confirmed';

    const STATUS_REJECTED = 'rejected';

    protected $fillable = ['school_subscription_id', 'payment_method_id', 'sender_number', 'transaction_id', 'status', 'reviewed_by', 'reviewed_at', 'rejection_reason'];

    protected function casts(): array
    {
        return ['reviewed_at' => 'datetime'];
    }

    public function subscription(): BelongsTo
    {
        return $this->belongsTo(SchoolSubscription::class, 'school_subscription_id');
    }

    public function paymentMethod(): BelongsTo
    {
        return $this->belongsTo(PaymentMethod::class);
    }

    public function reviewer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reviewed_by');
    }
}
