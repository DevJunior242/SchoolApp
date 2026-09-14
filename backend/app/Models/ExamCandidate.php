<?php

namespace App\Models;

use App\Traits\Loggable;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\SoftDeletes;

class ExamCandidate extends Model
{
    use HasUuids, SoftDeletes, Loggable;

    protected $fillable = [
        'exam_id',
        'student_id',
        'school_class_id',
        'candidate_number',
        'attendance_status',
        'is_absent',
        'remarks',
    ];

    protected function casts(): array
    {
        return [
            'is_absent' => 'boolean',
        ];
    }

    public function exam(): BelongsTo
    {
        return $this->belongsTo(Exam::class);
    }

    public function student(): BelongsTo
    {
        return $this->belongsTo(Student::class);
    }

    public function schoolClass(): BelongsTo
    {
        return $this->belongsTo(SchoolClass::class, 'school_class_id');
    }

    public function examCandidateSubjects(): HasMany
    {
        return $this->hasMany(ExamCandidateSubject::class);
    }

    public function examResult(): HasOne
    {
        return $this->hasOne(ExamResult::class);
    }
}
