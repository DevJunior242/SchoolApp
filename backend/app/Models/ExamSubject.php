<?php

namespace App\Models;

use App\Traits\Loggable;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class ExamSubject extends Model
{
    use HasUuids, SoftDeletes, Loggable;

    protected $table = 'exam_subjects';

    protected $fillable = [
        'exam_id',
        'school_class_id',
        'subject_id',
        'coefficient',
        'max_score',
        'order',
        'is_mandatory',
        'exam_date',
        'start_time',
        'end_time',
    ];

    protected function casts(): array
    {
        return [
            'exam_date' => 'date',
            'is_mandatory' => 'boolean',
        ];
    }

    public function exam(): BelongsTo
    {
        return $this->belongsTo(Exam::class);
    }

    public function subject(): BelongsTo
    {
        return $this->belongsTo(Subject::class);
    }

    public function schoolClass(): BelongsTo
    {
        return $this->belongsTo(SchoolClass::class, 'school_class_id');
    }

    public function examCandidateSubjects(): HasMany
    {
        return $this->hasMany(ExamCandidateSubject::class);
    }

    public function examResultDetails(): HasMany
    {
        return $this->hasMany(ExamResultDetail::class);
    }
}
