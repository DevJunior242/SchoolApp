<?php

namespace App\Models;

use App\Models\Bus;
use App\Models\User;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class BusTrip extends Model
{
    use HasUuids;

    const DIRECTION_PICKUP = 1;

    const DIRECTION_DROPOFF = 2;

    const STATUS_IN_PROGRESS = 1;

    const STATUS_COMPLETED = 2;

    protected $fillable = [
        'bus_id', 'driver_id', 'direction', 'status', 'current_latitude',
        'current_longitude', 'last_ping_at', 'started_at', 'ended_at',
    ];

    protected function casts(): array
    {
        return [
            'current_latitude' => 'decimal:7',
            'current_longitude' => 'decimal:7',
            'last_ping_at' => 'datetime',
            'started_at' => 'datetime',
            'ended_at' => 'datetime',
        ];
    }

    public function bus(): BelongsTo
    {
        return $this->belongsTo(Bus::class);
    }

    public function driver(): BelongsTo
    {
        return $this->belongsTo(User::class, 'driver_id');
    }

    public function stopEvents(): HasMany
    {
        return $this->hasMany(BusTripStopEvent::class);
    }
}
