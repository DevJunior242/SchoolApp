<?php

namespace App\Models;

use App\Models\Book;
use App\Models\BookLoan;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class BookCopy extends Model
{
    use HasUuids;

    const STATUS_AVAILABLE = 1;

    const STATUS_BORROWED = 2;

    const STATUS_LOST = 3;

    protected $fillable = ['book_id', 'status', 'acquired_at', 'notes'];

    protected function casts(): array
    {
        return [
            'acquired_at' => 'date',
        ];
    }

    public function book(): BelongsTo
    {
        return $this->belongsTo(Book::class);
    }

    public function loans(): HasMany
    {
        return $this->hasMany(BookLoan::class);
    }
}
