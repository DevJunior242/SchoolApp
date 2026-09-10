<?php

namespace App\Models;

use App\Models\School;
use App\Models\Level;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class EnrollmentRequest extends Model
{
    use HasUuids;

    const STATUS_PENDING = 0;

    const STATUS_ACCEPTED = 1;

    const STATUS_REJECTED = 2;

    protected $fillable = [
        'school_id', 'child_fullname', 'child_birthdate', 'level_id', 'student_id',
        'parent_fullname', 'parent_phone', 'parent_email', 'message', 'status', 'rejection_reason',
    ];

    protected function casts(): array
    {
        return [
            'child_birthdate' => 'date',
            'status' => 'integer',
        ];
    }

    public function school(): BelongsTo
    {
        return $this->belongsTo(School::class);
    }

    public function level(): BelongsTo
    {
        return $this->belongsTo(Level::class);
    }

    public function student(): BelongsTo
    {
        return $this->belongsTo(Student::class);
    }
}
