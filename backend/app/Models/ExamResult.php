<?php

namespace App\Models;

use App\Traits\Loggable;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class ExamResult extends Model
{
    use HasUuids, SoftDeletes, Loggable;

    protected $fillable = [
        'exam_id',
        'exam_candidate_id',
        'total_score',
        'average',
        'rank',
        'status',
        'is_validated',
        'validated_at',
    ];

    protected function casts(): array
    {
        return [
            'total_score' => 'decimal:2',
            'average' => 'decimal:2',
            'is_validated' => 'boolean',
            'validated_at' => 'datetime',
        ];
    }

    public function exam(): BelongsTo
    {
        return $this->belongsTo(Exam::class);
    }

    public function examCandidate(): BelongsTo
    {
        return $this->belongsTo(ExamCandidate::class);
    }

    public function examResultDetails(): HasMany
    {
        return $this->hasMany(ExamResultDetail::class);
    }
}
