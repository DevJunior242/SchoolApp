<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class FeeStructure extends Model
{
    use HasUuids;

    const CATEGORY_TUITION = 1;

    const CATEGORY_CAFETERIA_SUBSCRIPTION = 2;

    // Contrairement à la scolarité, ces catégories n'exigent pas de niveau
    // (level_id nullable) : le directeur peut créer une tranche flat
    // (même montant pour tous) ou, s'il le souhaite, une par niveau.
    const CATEGORY_ENROLLMENT = 3;

    const CATEGORY_EXAM = 4;

    const CATEGORY_TRANSPORT = 5;

    const CATEGORY_UNIFORM = 6;

    const CATEGORY_OTHER = 7;

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
