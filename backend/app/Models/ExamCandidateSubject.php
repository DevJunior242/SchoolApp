<?php

namespace App\Models;

use App\Traits\Loggable;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class ExamCandidateSubject extends Model
{
    use HasUuids, SoftDeletes, Loggable;

    protected $table = 'exam_candidate_subjects';

    protected $fillable = [
        'exam_candidate_id',
        'exam_subject_id',
        'score',
        'score_out_of',
        'is_absent',
        'remark',
        'validated_at',
    ];

    protected function casts(): array
    {
        return [
            'score' => 'decimal:2',
            'score_out_of' => 'decimal:2',
            'is_absent' => 'boolean',
            'validated_at' => 'datetime',
        ];
    }

    public function examCandidate(): BelongsTo
    {
        return $this->belongsTo(ExamCandidate::class);
    }

    public function examSubject(): BelongsTo
    {
        return $this->belongsTo(ExamSubject::class);
    }
}
