<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Règles anti-fraude du pointage du personnel pour une école.
 * Le mode "printed" (QR imprimé fixe) impose toujours le contrôle du réseau
 * et du téléphone : sans eux, une simple photo du QR suffirait à pointer
 * depuis chez soi.
 */
class SchoolStaffAttendanceSetting extends Model
{
    use HasUuids;

    const MODE_ROTATING = 'rotating';

    const MODE_PRINTED = 'printed';

    protected $fillable = [
        'school_id',
        'qr_mode',
        'require_network',
        'require_device',
        'require_gps',
        'allowed_networks',
        'latitude',
        'longitude',
        'radius_meters',
        'emergency_until',
        'emergency_enabled_by',
        'printed_token',
        'printed_token_hash',
        'printed_token_generated_at',
    ];

    protected $hidden = ['printed_token', 'printed_token_hash'];

    protected $attributes = [
        'qr_mode' => self::MODE_ROTATING,
        'require_network' => false,
        'require_device' => false,
        'require_gps' => false,
        'radius_meters' => 150,
    ];

    protected function casts(): array
    {
        return [
            'require_network' => 'boolean',
            'require_device' => 'boolean',
            'require_gps' => 'boolean',
            'allowed_networks' => 'array',
            'latitude' => 'float',
            'longitude' => 'float',
            'radius_meters' => 'integer',
            'printed_token' => 'encrypted',
            'printed_token_generated_at' => 'datetime',
            'emergency_until' => 'datetime',
        ];
    }

    public static function forSchool(School $school): self
    {
        return self::query()->firstOrNew(['school_id' => $school->id]);
    }

    public function school(): BelongsTo
    {
        return $this->belongsTo(School::class);
    }

    public function isPrinted(): bool
    {
        return $this->qr_mode === self::MODE_PRINTED;
    }

    public function networkCheckEnabled(): bool
    {
        return $this->require_network || $this->isPrinted();
    }

    /**
     * Mode secours (Wi-Fi en panne) : le contrôle du réseau est suspendu
     * jusqu'à la fin de la journée, le téléphone reste vérifié.
     */
    public function emergencyActive(): bool
    {
        return $this->emergency_until !== null && $this->emergency_until->isFuture();
    }

    public function deviceCheckEnabled(): bool
    {
        return $this->require_device || $this->isPrinted();
    }

    public function gpsCheckEnabled(): bool
    {
        return $this->require_gps && $this->latitude !== null && $this->longitude !== null;
    }
}
