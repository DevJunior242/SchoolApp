<?php

namespace App\Models;

use App\Models\EventRecap;
use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class EventRecapPhoto extends Model
{
    use HasUuids;

    protected $fillable = ['event_recap_id', 'path'];

    protected $appends = ['url'];

    public function eventRecap(): BelongsTo
    {
        return $this->belongsTo(EventRecap::class);
    }

    protected function url(): Attribute
    {
        return Attribute::make(get: fn () => asset('storage/'.$this->path));
    }
}
