<?php

namespace App\Models;

use App\Models\Student;
use App\Models\User;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class StudentHealthProfile extends Model
{
    use HasUuids;

    protected $fillable = [
        'student_id', 'blood_type', 'chronic_conditions', 'disability',
        'doctor_name', 'doctor_phone', 'emergency_contact_name',
        'emergency_contact_phone', 'emergency_contact_phone2',
        'emergency_contact_relationship', 'preferred_hospital', 'updated_by',
    ];

    public function student(): BelongsTo
    {
        return $this->belongsTo(Student::class);
    }

    public function updater(): BelongsTo
    {
        return $this->belongsTo(User::class, 'updated_by');
    }
}
