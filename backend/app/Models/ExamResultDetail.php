<?php

namespace App\Models;

use App\Traits\Loggable;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class ExamResultDetail extends Model
{
    use HasUuids, SoftDeletes, Loggable;

    protected $fillable = [
        'exam_result_id',
        'exam_subject_id',
        'subject_score',
        'coefficient',
        'is_absent',
        'remark',
    ];

    protected function casts(): array
    {
        return [
            'subject_score' => 'decimal:2',
            'coefficient' => 'decimal:2',
            'is_absent' => 'boolean',
        ];
    }

    public function examResult(): BelongsTo
    {
        return $this->belongsTo(ExamResult::class);
    }

    public function examSubject(): BelongsTo
    {
        return $this->belongsTo(ExamSubject::class);
    }
}
