<?php

namespace App\Models;

use App\Models\Country;
use App\Models\ServiceProviderItem;
use App\Models\ServiceProviderPayment;
use App\Models\User;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ServiceProvider extends Model
{
    use HasUuids;

    const CATEGORY_ENSEIGNANT = 1;

    const CATEGORY_FORMATEUR = 2;

    const CATEGORY_CHAUFFEUR = 3;

    const CATEGORY_FOURNISSEUR = 4;

    const CATEGORY_IMPRIMEUR = 5;

    const CATEGORY_LIBRAIRIE = 6;

    const STATUS_PENDING = 1;

    const STATUS_APPROVED = 2;

    const STATUS_REJECTED = 3;

    protected $fillable = [
        'user_id', 'category', 'country_id', 'city', 'business_name', 'description', 'phone', 'email',
        'status', 'subscription_expires_at',
    ];

    protected function casts(): array
    {
        return [
            'subscription_expires_at' => 'date',
        ];
    }

    /**
     * Aucun paiement confirmé, ou le dernier est passé : la fiche reste sur
     * le compte du prestataire mais disparaît de l'annuaire des écoles.
     */
    public function hasActiveSubscription(): bool
    {
        return $this->subscription_expires_at !== null && ! $this->subscription_expires_at->isPast();
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function country(): BelongsTo
    {
        return $this->belongsTo(Country::class);
    }

    public function items(): HasMany
    {
        return $this->hasMany(ServiceProviderItem::class);
    }

    public function payments(): HasMany
    {
        return $this->hasMany(ServiceProviderPayment::class);
    }
}
