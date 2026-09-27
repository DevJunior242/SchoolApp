<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Téléphone autorisé à pointer pour un membre du personnel. Un compte n'a
 * qu'un téléphone et un téléphone ne sert qu'à un compte dans l'école.
 */
class SchoolStaffAttendanceDevice extends Model
{
    use HasUuids;

    protected $fillable = ['school_id', 'user_id', 'device_hash', 'user_agent', 'bound_at'];

    protected $hidden = ['device_hash'];

    protected function casts(): array
    {
        return ['bound_at' => 'datetime'];
    }

    public function school(): BelongsTo
    {
        return $this->belongsTo(School::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
