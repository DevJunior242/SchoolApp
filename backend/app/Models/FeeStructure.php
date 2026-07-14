<?php

namespace App\Models;

use App\Models\School;
use App\Models\Level;
use App\Models\SchoolYear;
use App\Models\Payment;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class FeeStructure extends Model
{
    use HasUuids;

    protected $fillable = ['school_id', 'level_id', 'school_year_id', 'label', 'amount', 'due_date', 'order'];

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

    public function schoolYear(): BelongsTo
    {
        return $this->belongsTo(SchoolYear::class);
    }

    public function payments(): HasMany
    {
        return $this->hasMany(Payment::class);
    }
}
