<?php

namespace App\Models;

use App\Models\SchoolClass;
use App\Models\Student;
use App\Models\Season;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\Pivot;

class ClassStudent extends Pivot
{
    use HasUuids;

    protected $table = 'class_student';

    const STATUS_ACTIVE = 1;

    const STATUS_TRANSFERRED_OUT = 2;

    protected $fillable = ['class_id', 'student_id', 'season_id', 'status'];

    public function schoolClass(): BelongsTo
    {
        return $this->belongsTo(SchoolClass::class, 'class_id');
    }

    public function student(): BelongsTo
    {
        return $this->belongsTo(Student::class);
    }

    public function season(): BelongsTo
    {
        return $this->belongsTo(Season::class);
    }
}
