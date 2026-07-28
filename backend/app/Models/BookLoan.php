<?php

namespace App\Models;

use App\Models\BookCopy;
use App\Models\School;
use App\Models\Student;
use App\Models\User;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class BookLoan extends Model
{
    use HasUuids;

    const STATUS_ACTIVE = 1;

    const STATUS_RETURNED = 2;

    const STATUS_LOST = 3;

    protected $fillable = [
        'school_id', 'book_copy_id', 'student_id', 'status', 'borrowed_at', 'due_at',
        'returned_at', 'issued_by', 'returned_to', 'due_soon_notified', 'overdue_notified',
    ];

    protected function casts(): array
    {
        return [
            'borrowed_at' => 'datetime',
            'due_at' => 'date',
            'returned_at' => 'datetime',
            'due_soon_notified' => 'boolean',
            'overdue_notified' => 'boolean',
        ];
    }

    public function school(): BelongsTo
    {
        return $this->belongsTo(School::class);
    }

    public function copy(): BelongsTo
    {
        return $this->belongsTo(BookCopy::class, 'book_copy_id');
    }

    public function student(): BelongsTo
    {
        return $this->belongsTo(Student::class);
    }

    public function issuedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'issued_by');
    }

    public function returnedTo(): BelongsTo
    {
        return $this->belongsTo(User::class, 'returned_to');
    }
}
