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

    const PLAN_ECOLE = 'ecole';

    const PLAN_ETABLISSEMENT = 'etablissement';

    const PLAN_RESEAU = 'reseau';

    // Ordre croissant : sert à comparer deux paliers (ex. palier assez élevé
    // pour un module donné) sans dupliquer cette logique partout.
    const PLAN_ORDER = [self::PLAN_ECOLE, self::PLAN_ETABLISSEMENT, self::PLAN_RESEAU];

    // Modules réservés au palier Établissement et au-dessus (cf. page tarifs) :
    // le palier École couvre uniquement la gestion scolaire de base.
    const PLAN_RESTRICTED_MODULES = ['ai', 'library', 'cafeteria', 'health', 'buses'];

    const PLAN_ECOLE_MAX_STAFF_ACCOUNTS = 5;

    protected $fillable = [
        'country_id', 'name', 'logo', 'slogan', 'address', 'city', 'phone', 'email', 'website',
        'status', 'plan', 'language', 'currency', 'academic_period_type', 'cafeteria_low_balance_threshold',
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

    /**
     * Un module "restreint" (IA, bibliothèque, cantine, santé, bus) n'est
     * inclus qu'à partir du palier Établissement — cf. page tarifs.
     */
    public function hasModule(string $module): bool
    {
        if (! in_array($module, self::PLAN_RESTRICTED_MODULES, true)) {
            return true;
        }

        return array_search($this->plan, self::PLAN_ORDER, true)
            >= array_search(self::PLAN_ETABLISSEMENT, self::PLAN_ORDER, true);
    }

    /**
     * Null = pas de limite (paliers Établissement et Réseau).
     */
    public function maxStaffAccounts(): ?int
    {
        return $this->plan === self::PLAN_ECOLE ? self::PLAN_ECOLE_MAX_STAFF_ACCOUNTS : null;
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
