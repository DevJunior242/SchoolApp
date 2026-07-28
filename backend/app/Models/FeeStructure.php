<?php

namespace App\Models;

use App\Models\School;
use App\Models\Level;
use App\Models\Season;
use App\Models\SchoolYear;
use App\Models\Payment;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class FeeStructure extends Model
{
    use HasUuids;

    const CATEGORY_TUITION = 1;

    const CATEGORY_CAFETERIA_SUBSCRIPTION = 2;

    protected $fillable = [
        'school_id', 'level_id', 'season_id', 'school_year_id', 'category', 'label', 'amount', 'due_date', 'order',
    ];

    protected function casts(): array
    {
        return [
            'amount' => 'decimal:2',
            'due_date' => 'date',
        ];
    }

    public function school(): BelongsTo
    {
        return $this->belongsTo(School::class);
    }

    public function level(): BelongsTo
    {
        return $this->belongsTo(Level::class);
    }

    public function season(): BelongsTo
    {
        return $this->belongsTo(Season::class);
    }

    public function schoolYear(): BelongsTo
    {
        return $this->belongsTo(SchoolYear::class);
    }

    public function payments(): HasMany
    {
        return $this->hasMany(Payment::class);
    }
}
