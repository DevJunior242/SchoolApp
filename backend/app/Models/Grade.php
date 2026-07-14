<?php

namespace App\Models;

use App\Models\ClassSubjectTeacher;
use App\Models\Student;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Grade extends Model
{
    use HasUuids;

    const TYPE_DEVOIR = 'devoir';

    const TYPE_INTERROGATION = 'interrogation';

    const TYPE_COMPOSITION = 'composition';

    const TYPE_EXAMEN = 'examen';

    /**
     * Coefficient par défaut selon le type, si le prof n'en précise pas.
     */
    const DEFAULT_COEFFICIENTS = [
        self::TYPE_INTERROGATION => 1,
        self::TYPE_DEVOIR => 1,
        self::TYPE_COMPOSITION => 2,
        self::TYPE_EXAMEN => 3,
    ];

    protected $fillable = [
        'class_subject_teacher_id', 'student_id', 'evaluation_type',
        'title', 'score', 'max_score', 'coefficient', 'graded_at',
    ];

    protected function casts(): array
    {
        return [
            'score' => 'decimal:2',
            'max_score' => 'decimal:2',
            'coefficient' => 'decimal:2',
            'graded_at' => 'date',
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
}
