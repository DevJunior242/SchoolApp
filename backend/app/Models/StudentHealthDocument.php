<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class StudentHealthDocument extends Model
{
    use HasUuids;

    const TYPE_CERTIFICATE = 1;

    const TYPE_VACCINATION_BOOKLET = 2;

    const TYPE_PRESCRIPTION = 3;

    const TYPE_REPORT = 4;

    protected $fillable = ['school_id', 'student_id', 'type', 'label', 'path', 'uploaded_by'];

    protected $hidden = ['path'];

    public function student(): BelongsTo
    {
        return $this->belongsTo(Student::class);
    }

    public function uploader(): BelongsTo
    {
        return $this->belongsTo(User::class, 'uploaded_by');
    }
}
