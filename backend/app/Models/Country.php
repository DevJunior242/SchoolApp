<?php

namespace App\Models;

use App\Models\Level;
use App\Models\School;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Country extends Model
{
    use HasUuids;

    protected $fillable = ['name', 'iso_code', 'phone_code', 'currency'];

    public function levels(): HasMany
    {
        return $this->hasMany(Level::class);
    }

    public function schools(): HasMany
    {
        return $this->hasMany(School::class);
    }
}
