<?php

namespace App\Models;

use App\Models\School;
use App\Models\Section;
use App\Traits\Loggable;
use Illuminate\Database\Eloquent\Relations\Pivot;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class SchoolSection extends Pivot
{
    use HasUuids, SoftDeletes, Loggable;

    protected $table = 'school_sections';

    protected $fillable = ['school_id', 'section_id', 'active'];

    public function school(): BelongsTo
    {
        return $this->belongsTo(School::class);
    }

    public function section(): BelongsTo
    {
        return $this->belongsTo(Section::class);
    }
}
