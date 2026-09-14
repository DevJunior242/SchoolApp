<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use App\Models\ClassSubjectTeacher;

class Subject extends Model
{
    use HasUuids;

    protected $fillable = ['school_id', 'name', 'code'];

    public function school()
    {
        return $this->belongsTo(School::class);
    }

    public function classSubjectTeachers(): HasMany
    {
        return $this->hasMany(ClassSubjectTeacher::class);
    }
}
