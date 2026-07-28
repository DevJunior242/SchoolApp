<?php

namespace App\Models;

use App\Models\Student;
use App\Models\User;
use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class StudentVaccination extends Model
{
    use HasUuids;

    protected $fillable = [
        'student_id', 'name', 'administered_at', 'expires_at',
        'next_dose_at', 'document_path', 'expiry_notified', 'created_by',
    ];

    protected $appends = ['has_document'];

    protected $hidden = ['document_path'];

    protected function casts(): array
    {
        return [
            'administered_at' => 'date',
            'expires_at' => 'date',
            'next_dose_at' => 'date',
            'expiry_notified' => 'boolean',
        ];
    }

    protected function hasDocument(): Attribute
    {
        return Attribute::make(get: fn () => (bool) $this->document_path);
    }

    public function student(): BelongsTo
    {
        return $this->belongsTo(Student::class);
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
