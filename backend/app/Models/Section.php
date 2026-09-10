<?php

namespace App\Models;

use App\Models\Level;
use App\Models\School;
use App\Models\Expense;
use App\Models\PaymentMethod;
use App\Models\TreasuryAccount;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Relations\HasMany;
 
class Section extends Model
{
    use HasUuids;

    protected $fillable = ['name', 'code'];

    public function levels(): HasMany
    {
        return $this->hasMany(Level::class)->orderBy('order');
    }

   public function schools()
    {
        return $this->belongsToMany(School::class, 'school_sections')
            ->withPivot('active')
            ->withTimestamps();
    }
    public function treasuryAccounts(): HasMany
    {
        return $this->hasMany(TreasuryAccount::class);
    }
    public function paymentMethods(): HasMany
    {
        return $this->hasMany(PaymentMethod::class);
    }
    public function expenses(): HasMany
    {
        return $this->hasMany(Expense::class);
    }

     
}
