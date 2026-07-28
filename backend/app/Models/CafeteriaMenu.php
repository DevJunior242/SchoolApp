<?php

namespace App\Models;

use App\Models\School;
use App\Models\User;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class CafeteriaMenu extends Model
{
    use HasUuids;

    protected $fillable = ['school_id', 'date', 'created_by'];

    protected function casts(): array
    {
        return ['date' => 'date'];
    }

    public function school(): BelongsTo
    {
        return $this->belongsTo(School::class);
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function items(): HasMany
    {
        return $this->hasMany(CafeteriaMenuItem::class);
    }
}
