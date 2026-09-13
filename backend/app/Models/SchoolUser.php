<?php

namespace App\Models;

use App\Models\Role;
use App\Models\School;
use App\Models\User;
use App\Traits\Loggable;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\Pivot;
use Illuminate\Database\Eloquent\SoftDeletes;

class SchoolUser extends Pivot
{
    use HasUuids, Loggable;

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

    public function sections(): BelongsToMany
    {
        return $this->belongsToMany(
            Section::class,
            'school_user_sections',
            'school_user_id',
            'section_id',
            'id',
            'id'
        )
            ->using(SchoolUserSection::class)
            ->withTimestamps();
    }

    public function staffProfile()
    {
        return $this->hasOne(SchoolStaffProfile::class, 'user_id', 'user_id');
    }
}
