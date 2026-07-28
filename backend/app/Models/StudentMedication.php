<?php

namespace App\Models;

use App\Models\Student;
use App\Models\User;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class StudentMedication extends Model
{
    use HasUuids;

    protected $fillable = [
        'student_id', 'name', 'dosage', 'starts_on', 'ends_on',
        'notes', 'parent_authorized', 'created_by',
    ];

    protected function casts(): array
    {
        return [
            'starts_on' => 'date',
            'ends_on' => 'date',
            'parent_authorized' => 'boolean',
        ];
    }

    public function student(): BelongsTo
    {
        return $this->belongsTo(Student::class);
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function isOngoing(): bool
    {
        $today = now()->toDateString();

        return $this->starts_on->toDateString() <= $today && (! $this->ends_on || $this->ends_on->toDateString() >= $today);
    }
}
