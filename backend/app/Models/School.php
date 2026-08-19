<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

class School extends Model
{
    use HasUuids;

    const STATUS_INACTIVE = 0;

    const STATUS_ACTIVE = 1;

    // École en essai gratuit expiré : consultation seule, toute création/
    // modification est bloquée jusqu'à réactivation par le superadmin.
    const STATUS_READ_ONLY = 2;

    const LANGUAGE_FR = 'fr';

    const LANGUAGE_EN = 'en';

    protected $fillable = [
        'country_id', 'name', 'logo', 'slogan', 'address', 'city', 'phone', 'email', 'website',
        'status', 'language', 'currency', 'academic_period_type', 'cafeteria_low_balance_threshold',
        'library_loan_duration_days', 'trial_ends_at', 'trial_reminder_sent_at',
    ];

    protected $casts = [
        'trial_ends_at' => 'datetime',
        'trial_reminder_sent_at' => 'datetime',
    ];

    protected $appends = ['logo_url'];

    public function isReadOnly(): bool
    {
        return $this->status === self::STATUS_READ_ONLY;
    }

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

    public function buses(): HasMany
    {
        return $this->hasMany(Bus::class);
    }

    public function books(): HasMany
    {
        return $this->hasMany(Book::class);
    }
}
