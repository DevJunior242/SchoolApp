<?php

namespace App\Models;

use App\Models\Book;
use App\Models\School;
use App\Models\Student;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class BookReservation extends Model
{
    use HasUuids;

    const STATUS_WAITING = 1;

    const STATUS_READY = 2;

    const STATUS_FULFILLED = 3;

    const STATUS_CANCELLED = 4;

    protected $fillable = ['school_id', 'book_id', 'student_id', 'status', 'reserved_at', 'notified_at'];

    protected function casts(): array
    {
        return [
            'reserved_at' => 'datetime',
            'notified_at' => 'datetime',
        ];
    }

    public function school(): BelongsTo
    {
        return $this->belongsTo(School::class);
    }

    public function book(): BelongsTo
    {
        return $this->belongsTo(Book::class);
    }

    public function student(): BelongsTo
    {
        return $this->belongsTo(Student::class);
    }
}
