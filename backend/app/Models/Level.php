<?php

namespace App\Models;

use App\Models\Section;
use App\Models\SchoolClass;
use App\Models\FeeStructure;
use Illuminate\Database\Eloquent\Model;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\BelongsTo;


class Level extends Model
{
   use HasUuids;

    protected $fillable = ['section_id', 'name', 'code', 'order'];

    public function section(): BelongsTo
    {
        return $this->belongsTo(Section::class);
    }

    public function classes(): HasMany
    {
        return $this->hasMany(SchoolClass::class, 'level_id');
    }
    public function feeStructures(): HasMany
    {
        return $this->hasMany(FeeStructure::class);
    }
}
