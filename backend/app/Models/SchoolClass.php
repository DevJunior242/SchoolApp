<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use App\Models\School;
use App\Models\Level;
use App\Models\SchoolYear;
use App\Models\Student;
use App\Models\ClassStudent;
use App\Models\ClassSubjectTeacher;

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
            ->withPivot('season_id', 'status')
            ->withTimestamps();
    }

    public function classSubjectTeachers(): HasMany
    {
        return $this->hasMany(ClassSubjectTeacher::class, 'class_id');
    }
}
