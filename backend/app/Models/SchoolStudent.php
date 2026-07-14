<?php

namespace App\Models;

use App\Models\School;
use App\Models\Student;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SchoolStudent extends Model
{
    use HasUuids;

    const STATUS_INACTIVE = 0;

    const STATUS_ACTIVE = 1;

    const STATUS_LEFT = 2;

    protected $fillable = ['school_id', 'student_id', 'matricule', 'admission_date', 'previous_school', 'status'];

    protected function casts(): array
    {
        return [
            'admission_date' => 'date',
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
}
