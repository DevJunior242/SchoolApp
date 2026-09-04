<?php

namespace App\Models;

use App\Models\School as SchoolModel;
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
        'annual_base_amount',
        'monthly_enabled',
        'annual_enabled',
        'annual_discount_enabled',
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
            'annual_base_amount' => 'decimal:2',
            'monthly_enabled' => 'boolean',
            'annual_enabled' => 'boolean',
            'annual_discount_enabled' => 'boolean',
            'annual_discount_percentage' => 'decimal:2',
            'max_staff_accounts' => 'integer',
            'modules' => 'array',
            'active' => 'boolean',
        ];
    }

    protected $appends = ['annual_amount'];

    public function getAnnualAmountAttribute(): string
    {
        $annual = $this->annual_base_amount !== null
            ? (float) $this->annual_base_amount
            : (float) $this->monthly_amount * 12;
        $discount = $this->annual_discount_enabled
            ? (float) $this->annual_discount_percentage
            : 0;

        return number_format($annual * (1 - ($discount / 100)), 2, '.', '');
    }

    public function schools(): HasMany
    {
        return $this->hasMany(SchoolModel::class, 'pricing_plan_id');
    }
}
