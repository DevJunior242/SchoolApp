<?php

namespace App\Models;

use App\Models\ClassSubjectTeacher;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TimetableSlot extends Model
{
    use HasUuids;

    const DAY_LUNDI = 1;

    const DAY_MARDI = 2;

    const DAY_MERCREDI = 3;

    const DAY_JEUDI = 4;

    const DAY_VENDREDI = 5;

    const DAY_SAMEDI = 6;

    protected $fillable = ['class_subject_teacher_id', 'day_of_week', 'start_time', 'end_time', 'room'];

    public function classSubjectTeacher(): BelongsTo
    {
        return $this->belongsTo(ClassSubjectTeacher::class);
    }
}
