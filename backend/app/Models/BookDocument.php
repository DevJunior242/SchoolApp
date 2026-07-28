<?php

namespace App\Models;

use App\Models\Book;
use App\Models\Level;
use App\Models\School;
use App\Models\User;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class BookDocument extends Model
{
    use HasUuids;

    protected $fillable = ['school_id', 'book_id', 'title', 'path', 'level_id', 'uploaded_by', 'download_count'];

    public function school(): BelongsTo
    {
        return $this->belongsTo(School::class);
    }

    public function book(): BelongsTo
    {
        return $this->belongsTo(Book::class);
    }

    public function level(): BelongsTo
    {
        return $this->belongsTo(Level::class);
    }

    public function uploadedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'uploaded_by');
    }
}
