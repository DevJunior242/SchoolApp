<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use App\Models\SchoolClass;
use App\Models\Subject;
use App\Models\User;
use App\Models\TimetableSlot;
use App\Models\Grade;
use App\Models\Attendance;
use App\Models\CourseContent;

class ClassSubjectTeacher extends Model
{
    use HasUuids;

    protected $table = 'class_subject_teacher';

    protected $fillable = ['class_id', 'subject_id', 'user_id', 'coefficient'];

    protected function casts(): array
    {
        return ['coefficient' => 'decimal:2'];
    }

    public function schoolClass(): BelongsTo
    {
        return $this->belongsTo(SchoolClass::class, 'class_id');
    }

    public function subject(): BelongsTo
    {
        return $this->belongsTo(Subject::class);
    }

    public function teacher(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function timetableSlots(): HasMany
    {
        return $this->hasMany(TimetableSlot::class);
    }

    public function grades(): HasMany
    {
        return $this->hasMany(Grade::class);
    }

    public function attendances(): HasMany
    {
        return $this->hasMany(Attendance::class);
    }

    public function courseContents(): HasMany
    {
        return $this->hasMany(CourseContent::class);
    }
}
