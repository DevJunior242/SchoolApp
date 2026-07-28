<?php

namespace App\Models;

use App\Models\MarketplacePlan;
use App\Models\PaymentMethod;
use App\Models\ServiceProvider;
use App\Models\User;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ServiceProviderPayment extends Model
{
    use HasUuids;

    const STATUS_PENDING = 1;

    const STATUS_CONFIRMED = 2;

    const STATUS_REJECTED = 3;

    protected $fillable = [
        'service_provider_id', 'marketplace_plan_id', 'payment_method_id', 'amount', 'reference',
        'status', 'confirmed_by', 'confirmed_at',
    ];

    protected function casts(): array
    {
        return [
            'amount' => 'decimal:2',
            'confirmed_at' => 'datetime',
        ];
    }

    public function serviceProvider(): BelongsTo
    {
        return $this->belongsTo(ServiceProvider::class);
    }

    public function plan(): BelongsTo
    {
        return $this->belongsTo(MarketplacePlan::class, 'marketplace_plan_id');
    }

    public function paymentMethod(): BelongsTo
    {
        return $this->belongsTo(PaymentMethod::class);
    }

    public function confirmedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'confirmed_by');
    }
}
