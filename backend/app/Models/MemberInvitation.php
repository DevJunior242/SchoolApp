<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class MemberInvitation extends Model
{
    use HasUuids;

    public const STATUS_PENDING = 'pending';
    public const STATUS_SUBMITTED = 'submitted';
    public const STATUS_ACCEPTED = 'accepted';
    public const STATUS_REJECTED = 'rejected';

    protected $fillable = [
        'token_hash',
        'school_id',
        'role_id',
        'created_by',
        'reviewed_by',
        'section_ids',
        'fullname',
        'email',
        'phone',
        'password',
        'status',
        'rejection_reason',
        'expires_at',
        'submitted_at',
        'reviewed_at',
    ];

    protected $hidden = ['token_hash', 'password'];

    protected function casts(): array
    {
        return [
            'section_ids' => 'array',
            'expires_at' => 'datetime',
            'submitted_at' => 'datetime',
            'reviewed_at' => 'datetime',
        ];
    }

    public function school(): BelongsTo
    {
        return $this->belongsTo(School::class);
    }

    public function role(): BelongsTo
    {
        return $this->belongsTo(Role::class);
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function reviewer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reviewed_by');
    }
}
