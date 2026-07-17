<?php

namespace App\Models;

use App\Models\School;
use App\Models\SchoolClass;
use App\Models\User;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Event extends Model
{
    use HasUuids;

    const TYPE_REUNION = 1;

    const TYPE_EXAMEN = 2;

    const TYPE_SORTIE = 3;

    const TYPE_FERIE = 4;

    const TYPE_BULLETIN = 5;

    const TYPE_AUTRE = 6;

    protected $fillable = [
        'school_id', 'class_id', 'title', 'description', 'type',
        'start_at', 'end_at', 'location', 'created_by',
    ];

    protected function casts(): array
    {
        return [
            'start_at' => 'datetime',
            'end_at' => 'datetime',
        ];
    }

    public function school(): BelongsTo
    {
        return $this->belongsTo(School::class);
    }

    public function schoolClass(): BelongsTo
    {
        return $this->belongsTo(SchoolClass::class, 'class_id');
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
