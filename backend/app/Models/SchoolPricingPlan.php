<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class SchoolPricingPlan extends Model
{
    use HasUuids;

    protected $fillable = [
        'name',
        'slug',
        'monthly_amount',
        'monthly_enabled',
        'annual_enabled',
        'annual_discount_percentage',
        'currency',
        'max_staff_accounts',
        'modules',
        'active',
    ];

    protected function casts(): array
    {
        return [
            'monthly_amount' => 'decimal:2',
            'monthly_enabled' => 'boolean',
            'annual_enabled' => 'boolean',
            'annual_discount_percentage' => 'decimal:2',
            'max_staff_accounts' => 'integer',
            'modules' => 'array',
            'active' => 'boolean',
        ];
    }

    protected $appends = ['annual_amount'];

    public function getAnnualAmountAttribute(): string
    {
        $annual = (float) $this->monthly_amount * 12;
        $discount = (float) $this->annual_discount_percentage;

        return number_format($annual * (1 - ($discount / 100)), 2, '.', '');
    }

    public function schools(): HasMany
    {
        return $this->hasMany(School::class, 'pricing_plan_id');
    }
}
