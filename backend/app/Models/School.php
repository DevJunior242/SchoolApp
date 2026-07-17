<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use App\Models\Country;
use App\Models\SchoolUser;
use App\Models\User;
use App\Models\SchoolYear;
use App\Models\SchoolClass;
use App\Models\PaymentMethod;
use App\Models\FeeStructure;
use App\Models\Payment;

class School extends Model
{
    use HasUuids;

    const STATUS_INACTIVE = 0;

    const STATUS_ACTIVE = 1;

    const LANGUAGE_FR = 'fr';

    const LANGUAGE_EN = 'en';

    protected $fillable = [
        'country_id', 'name', 'logo', 'slogan', 'address', 'city', 'phone', 'email', 'website',
        'status', 'language', 'currency',
    ];

    protected $appends = ['logo_url'];

    protected function logoUrl(): Attribute
    {
        return Attribute::make(get: fn () => $this->logo ? asset('storage/'.$this->logo) : null);
    }

    public function country(): BelongsTo
    {
        return $this->belongsTo(Country::class);
    }

    public function schoolUsers(): HasMany
    {
        return $this->hasMany(SchoolUser::class);
    }

    public function users(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'school_users')
            ->using(SchoolUser::class)
            ->withPivot('role_id', 'status')
            ->withTimestamps();
    }

    public function schoolYears(): HasMany
    {
        return $this->hasMany(SchoolYear::class);
    }

    public function classes(): HasMany
    {
        return $this->hasMany(SchoolClass::class);
    }

    public function paymentMethods(): HasMany
    {
        return $this->hasMany(PaymentMethod::class);
    }

    public function feeStructures(): HasMany
    {
        return $this->hasMany(FeeStructure::class);
    }

    public function payments(): HasMany
    {
        return $this->hasMany(Payment::class);
    }
}
