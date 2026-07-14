<?php

namespace App\Models;

use App\Models\ClassSubjectTeacher;
use App\Models\Student;
use App\Models\User;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Attendance extends Model
{
    use HasUuids;

    const STATUS_ABSENT = 0;

    const STATUS_PRESENT = 1;

    const STATUS_RETARD = 2;

    const JUSTIFICATION_NON_JUSTIFIEE = 0;

    const JUSTIFICATION_EN_ATTENTE = 1;

    const JUSTIFICATION_JUSTIFIEE = 2;

    const JUSTIFICATION_REJETEE = 3;

    protected $fillable = [
        'class_subject_teacher_id', 'student_id', 'date', 'status',
        'justification_status', 'justification_reason',
        'recorded_by', 'justified_by', 'justified_at',
    ];

    protected function casts(): array
    {
        return [
            'date' => 'date',
            'justified_at' => 'datetime',
        ];
    }

    public function classSubjectTeacher(): BelongsTo
    {
        return $this->belongsTo(ClassSubjectTeacher::class);
    }

    public function student(): BelongsTo
    {
        return $this->belongsTo(Student::class);
    }

    public function recordedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'recorded_by');
    }

    public function justifiedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'justified_by');
    }
}
