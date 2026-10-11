<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Appréciation d'un bulletin : par matière (class_subject_teacher_id) ou
 * générale (null), pour une période (season_id) ou l'année (null).
 */
class BulletinAppreciation extends Model
{
    use HasUuids;

    protected $fillable = [
        'school_id', 'student_id', 'class_id', 'class_subject_teacher_id',
        'season_id', 'content', 'author_id',
    ];

    public function author(): BelongsTo
    {
        return $this->belongsTo(User::class, 'author_id');
    }
}
