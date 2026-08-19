<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

class DemoRequest extends Model
{
    use HasUuids;

    const STATUS_PENDING = 0;

    const STATUS_CONTACTED = 1;

    const STATUS_CLOSED = 2;

    protected $fillable = [
        'school_name', 'email', 'phone', 'description', 'status',
    ];
}
