<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Demande d'un employé pour pointer avec un nouveau téléphone, validée par
 * la RH : évite qu'un téléphone quelconque prenne la place après une simple
 * réinitialisation.
 */
class SchoolStaffAttendanceDeviceRequest extends Model
{
    use HasUuids;

    const STATUS_PENDING = 'pending';

    const STATUS_APPROVED = 'approved';

    const STATUS_REJECTED = 'rejected';

    protected $fillable = [
        'school_id', 'user_id', 'device_hash', 'user_agent',
        'status', 'reviewed_by', 'reviewed_at',
    ];

    protected $hidden = ['device_hash'];

    protected function casts(): array
    {
        return ['reviewed_at' => 'datetime'];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function reviewer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reviewed_by');
    }
}
