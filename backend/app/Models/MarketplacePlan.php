<?php

namespace App\Models;

use App\Models\ServiceProviderPayment;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class MarketplacePlan extends Model
{
    use HasUuids;

    const PERIOD_MONTHLY = 1;

    const PERIOD_ANNUAL = 2;

    protected $fillable = ['period', 'amount', 'currency', 'active'];

    protected function casts(): array
    {
        return [
            'amount' => 'decimal:2',
            'active' => 'boolean',
        ];
    }

    public function payments(): HasMany
    {
        return $this->hasMany(ServiceProviderPayment::class);
    }
}
