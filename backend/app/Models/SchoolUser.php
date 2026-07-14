<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\Pivot;
use App\Models\School;
use App\Models\User;
use App\Models\Role;

class SchoolUser extends Pivot
{
    use HasUuids;

    protected $table = 'school_users';

    const STATUS_INACTIVE = 0;

    const STATUS_ACTIVE = 1;

    const STATUS_LEFT = 2;

    protected $fillable = ['school_id', 'user_id', 'role_id', 'status'];

    public function school(): BelongsTo
    {
        return $this->belongsTo(School::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function role(): BelongsTo
    {
        return $this->belongsTo(Role::class);
    }
}
