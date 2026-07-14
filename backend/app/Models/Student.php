<?php

namespace App\Models;

use App\Models\User;
use App\Models\ParentStudent;
use App\Models\SchoolStudent;
use App\Models\ClassStudent;
use App\Models\Grade;
use App\Models\Payment;
use App\Models\Attendance;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Student extends Model
{
    use HasUuids;

    protected $fillable = [
        'user_id', 'fullname', 'date_of_birth', 'gender',
        'birth_place', 'blood_type', 'medical_notes', 'photo',
    ];

    protected function casts(): array
    {
        return [
            'date_of_birth' => 'date',
        ];
    }

    public function isMajeur(): bool
    {
        return $this->date_of_birth->age >= 18;
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function parents(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'parent_student', 'student_id', 'parent_user_id')
            ->using(ParentStudent::class)
            ->withPivot('relationship', 'is_primary_contact')
            ->withTimestamps();
    }

    public function schoolStudents(): HasMany
    {
        return $this->hasMany(SchoolStudent::class);
    }

    public function classStudents(): HasMany
    {
        return $this->hasMany(ClassStudent::class);
    }

    public function grades(): HasMany
    {
        return $this->hasMany(Grade::class);
    }

    public function payments(): HasMany
    {
        return $this->hasMany(Payment::class);
    }

    public function attendances(): HasMany
    {
        return $this->hasMany(Attendance::class);
    }
}
