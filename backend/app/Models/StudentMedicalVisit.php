<?php

namespace App\Models;

use App\Models\School;
use App\Models\Student;
use App\Models\User;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class StudentMedicalVisit extends Model
{
    use HasUuids;

    protected $fillable = [
        'school_id', 'student_id', 'visited_at', 'reason', 'diagnosis',
        'treatment_given', 'rest_recommended', 'is_emergency', 'returned_to_class_at', 'recorded_by',
    ];

    protected function casts(): array
    {
        return [
            'visited_at' => 'datetime',
            'returned_to_class_at' => 'datetime',
            'rest_recommended' => 'boolean',
            'is_emergency' => 'boolean',
        ];
    }

    public function school(): BelongsTo
    {
        return $this->belongsTo(School::class);
    }

    public function student(): BelongsTo
    {
        return $this->belongsTo(Student::class);
    }

    public function recorder(): BelongsTo
    {
        return $this->belongsTo(User::class, 'recorded_by');
    }
}
