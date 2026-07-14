<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use App\Models\SchoolUser;

class Role extends Model
{
    use HasUuids;

    protected $fillable = ['name', 'slug'];

    public function schoolUsers(): HasMany
    {
        return $this->hasMany(SchoolUser::class);
    }
}
