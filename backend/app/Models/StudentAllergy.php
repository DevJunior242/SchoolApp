<?php

namespace App\Models;

use App\Models\Student;
use App\Models\User;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class StudentAllergy extends Model
{
    use HasUuids;

    const SEVERITY_MILD = 1;

    const SEVERITY_SEVERE = 2;

    protected $fillable = ['student_id', 'label', 'severity', 'notes', 'created_by'];

    public function student(): BelongsTo
    {
        return $this->belongsTo(Student::class);
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
