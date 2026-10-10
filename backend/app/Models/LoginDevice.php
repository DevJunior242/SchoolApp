<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

/** Appareil déjà utilisé pour se connecter à un compte (alerte « nouvel appareil »). */
class LoginDevice extends Model
{
    use HasUuids;

    protected $fillable = ['user_id', 'device_hash', 'label', 'last_ip', 'first_seen_at', 'last_seen_at'];

    protected function casts(): array
    {
        return [
            'first_seen_at' => 'datetime',
            'last_seen_at' => 'datetime',
        ];
    }
}
