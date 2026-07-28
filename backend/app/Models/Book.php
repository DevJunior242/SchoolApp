<?php

namespace App\Models;

use App\Models\BookCopy;
use App\Models\BookDocument;
use App\Models\BookReservation;
use App\Models\Level;
use App\Models\School;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Book extends Model
{
    use HasUuids;

    protected $fillable = [
        'school_id', 'title', 'author', 'publisher', 'isbn', 'category', 'language', 'level_id', 'description',
    ];

    public function school(): BelongsTo
    {
        return $this->belongsTo(School::class);
    }

    public function level(): BelongsTo
    {
        return $this->belongsTo(Level::class);
    }

    public function copies(): HasMany
    {
        return $this->hasMany(BookCopy::class);
    }

    public function reservations(): HasMany
    {
        return $this->hasMany(BookReservation::class);
    }

    public function documents(): HasMany
    {
        return $this->hasMany(BookDocument::class);
    }
}
