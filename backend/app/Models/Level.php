<?php

namespace App\Models;

use App\Models\Country;
use App\Models\SchoolClass;
use App\Models\FeeStructure;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Concerns\HasUuids;

use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\BelongsTo;


class Level extends Model
{
    use HasUuids;

    const CYCLE_PRIMAIRE = 'primaire';

    const CYCLE_1ER_CYCLE = '1er_cycle';

    const CYCLE_2ND_CYCLE = '2nd_cycle';

    protected $fillable = ['country_id', 'name', 'cycle', 'order'];

    public function country(): BelongsTo
    {
        return $this->belongsTo(Country::class);
    }

    public function classes(): HasMany
    {
        return $this->hasMany(SchoolClass::class);
    }

    public function feeStructures(): HasMany
    {
        return $this->hasMany(FeeStructure::class);
    }
}
