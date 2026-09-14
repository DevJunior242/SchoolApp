<?php

namespace App\Models;

use App\Models\ExamTarget;
use App\Traits\Loggable;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Exam extends Model
{
    use HasUuids, SoftDeletes, Loggable;

    protected $fillable = [
        'school_id',
        'school_year_id',
        'exam_type_id',
        'exam_mode',
        'name',
        'slug',
        'start_date',
        'end_date',
        'status',
        'is_published',
        'remarks',
    ];

    protected function casts(): array
    {
        return [
            'start_date' => 'date',
            'end_date' => 'date',
            'is_published' => 'boolean',
        ];
    }

    public function school(): BelongsTo
    {
        return $this->belongsTo(School::class);
    }

    public function schoolYear(): BelongsTo
    {
        return $this->belongsTo(SchoolYear::class);
    }

    public function examType(): BelongsTo
    {
        return $this->belongsTo(ExamType::class);
    }

    public function examSubjects(): HasMany
    {
        return $this->hasMany(ExamSubject::class);
    }

    public function examCandidates(): HasMany
    {
        return $this->hasMany(ExamCandidate::class);
    }

    public function examResults(): HasMany
    {
        return $this->hasMany(ExamResult::class);
    }

    public function examTargets(): HasMany
    {
        return $this->hasMany(ExamTarget::class);
    }
}
