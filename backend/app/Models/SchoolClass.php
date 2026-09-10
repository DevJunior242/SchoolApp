<?php

namespace App\Models;

use App\Models\Level;
use App\Models\School;
use App\Models\Student;
use App\Models\SchoolYear;
use App\Models\ClassStudent;
use App\Models\ClassSubjectTeacher;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class SchoolClass extends Model
{
    use HasUuids;

    protected $table = 'classes';

    protected $fillable = ['school_id', 'level_id', 'school_year_id', 'name'];

    public function school(): BelongsTo
    {
        return $this->belongsTo(School::class);
    }

    public function level(): BelongsTo
    {
        return $this->belongsTo(Level::class);
    }

    public function schoolYear(): BelongsTo
    {
        return $this->belongsTo(SchoolYear::class);
    }

    public function students(): BelongsToMany
    {
        return $this->belongsToMany(Student::class, 'class_student')
            ->using(ClassStudent::class)
            ->withPivot('status')
            ->withTimestamps();
    }

    public function classSubjectTeachers(): HasMany
    {
        return $this->hasMany(ClassSubjectTeacher::class, 'class_id');
    }
}
