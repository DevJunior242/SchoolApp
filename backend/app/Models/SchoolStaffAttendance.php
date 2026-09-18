<?php

namespace App\Models;

use App\Traits\Loggable;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SchoolStaffAttendance extends Model
{
    use HasUuids, Loggable;

    protected $fillable = [
        'school_id',
        'user_id',
        'attendance_date',
        'check_in',
        'check_out',
        'check_in_source',
        'check_out_source',
        'correction_reason',
        'corrected_by',
        'corrected_at',
    ];

    protected $casts = [
        'attendance_date' => 'date:Y-m-d',
        'check_in' => 'datetime',
        'check_out' => 'datetime',
        'corrected_at' => 'datetime',
    ];

    public function school(): BelongsTo
    {
        return $this->belongsTo(School::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function correctedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'corrected_by');
    }
}
