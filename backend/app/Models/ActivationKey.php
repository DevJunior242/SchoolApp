<?php

namespace App\Models;

use App\Models\School;
use App\Models\User;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Str;

class ActivationKey extends Model
{
    use HasUuids;

    const STATUS_DISPONIBLE = 0;

    const STATUS_UTILISEE = 1;

    const STATUS_REVOQUEE = 2;

    protected $fillable = ['key', 'status', 'created_by', 'school_id', 'used_at'];

    protected function casts(): array
    {
        return [
            'used_at' => 'datetime',
        ];
    }

    public static function generate(string $creatorId): self
    {
        return self::query()->create([
            'key' => 'school-'.Str::random(60),
            'status' => self::STATUS_DISPONIBLE,
            'created_by' => $creatorId,
        ]);
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function school(): BelongsTo
    {
        return $this->belongsTo(School::class);
    }
}
