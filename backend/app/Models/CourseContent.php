<?php

namespace App\Models;

use App\Models\ClassSubjectTeacher;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CourseContent extends Model
{
    use HasUuids;

    const CATEGORY_VIDEO = 1;

    const CATEGORY_DEVOIR = 2;

    const CATEGORY_EXAMEN = 3;

    protected $fillable = [
        'class_subject_teacher_id', 'category', 'title', 'description', 'video_url', 'file_path', 'correction_path',
    ];

    public function classSubjectTeacher(): BelongsTo
    {
        return $this->belongsTo(ClassSubjectTeacher::class);
    }
}
