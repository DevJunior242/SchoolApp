<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SchoolStaffLeave extends Model
{
    use HasUuids;

    public const TYPE_ANNUAL = 'Congé annuel';

    public const TYPE_SICK = 'Maladie';

    public const TYPE_EXCEPTIONAL = 'Congé exceptionnel';

    public const TYPE_MATERNITY = 'Congé maternité';

    public const STATUS_PENDING = 1;

    public const STATUS_APPROVED = 2;

    public const STATUS_REJECTED = 3;

    protected $fillable = [
        'school_id',
        'user_id',
        'leave_type',
        'status',
        'starts_on',
        'ends_on',
        'reason',
        'approved_by',
        'approved_at',
    ];

    protected $casts = [
        'starts_on' => 'date:Y-m-d',
        'ends_on' => 'date:Y-m-d',
        'approved_at' => 'datetime',
    ];

    public function school(): BelongsTo
    {
        return $this->belongsTo(School::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function approver(): BelongsTo
    {
        return $this->belongsTo(User::class, 'approved_by');
    }

    public static function leaveTypeLabel(?string $value): ?string
    {
        return $value;
    }

    public static function statusLabel(?int $value): ?string
    {
        return match ($value) {
            self::STATUS_PENDING => 'En attente',
            self::STATUS_APPROVED => 'Accepté',
            self::STATUS_REJECTED => 'Refusé',
            default => null,
        };
    }
}
