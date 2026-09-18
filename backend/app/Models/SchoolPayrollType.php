<?php

namespace App\Models;

use App\Traits\Loggable;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class SchoolPayrollType extends Model
{
    use HasUuids, Loggable;

    public const KIND_GAIN = 'gain';
    public const KIND_RETENTION = 'retention';

    protected $fillable = [
        'school_id',
        'name',
        'code',
        'kind',
        'is_active',
        'description',
    ];

    protected $casts = [
        'is_active' => 'boolean',
    ];

    public function school(): BelongsTo
    {
        return $this->belongsTo(School::class);
    }

    public function entries(): HasMany
    {
        return $this->hasMany(SchoolPayrollEntry::class, 'type_id');
    }
}
