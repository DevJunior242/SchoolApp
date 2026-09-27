<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Journal de chaque tentative de pointage (acceptée ou refusée), pour que
 * la RH puisse vérifier en cas de litige.
 */
class SchoolStaffAttendancePunch extends Model
{
    use HasUuids;

    const RESULT_CHECK_IN = 'check_in';

    const RESULT_CHECK_OUT = 'check_out';

    const RESULT_REJECTED = 'rejected';

    protected $fillable = [
        'school_id',
        'user_id',
        'school_staff_attendance_id',
        'result',
        'rejection_reason',
        'flags',
        'qr_mode',
        'ip_address',
        'device_hash',
        'user_agent',
        'latitude',
        'longitude',
        'accuracy_meters',
        'distance_meters',
    ];

    protected $hidden = ['device_hash'];

    protected function casts(): array
    {
        return [
            'flags' => 'array',
            'latitude' => 'float',
            'longitude' => 'float',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function attendance(): BelongsTo
    {
        return $this->belongsTo(SchoolStaffAttendance::class, 'school_staff_attendance_id');
    }
}
