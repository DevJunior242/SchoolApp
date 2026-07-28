<?php

namespace App\Models;

use App\Models\BusStop;
use App\Models\BusTrip;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class BusTripStopEvent extends Model
{
    use HasUuids;

    protected $fillable = ['bus_trip_id', 'bus_stop_id', 'notified_at', 'reached_at'];

    protected function casts(): array
    {
        return [
            'notified_at' => 'datetime',
            'reached_at' => 'datetime',
        ];
    }

    public function trip(): BelongsTo
    {
        return $this->belongsTo(BusTrip::class, 'bus_trip_id');
    }

    public function stop(): BelongsTo
    {
        return $this->belongsTo(BusStop::class, 'bus_stop_id');
    }
}
