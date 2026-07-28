<?php

namespace App\Models;

use App\Models\CafeteriaMenu;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CafeteriaMenuItem extends Model
{
    use HasUuids;

    protected $fillable = ['cafeteria_menu_id', 'label', 'price'];

    protected function casts(): array
    {
        return ['price' => 'decimal:2'];
    }

    public function menu(): BelongsTo
    {
        return $this->belongsTo(CafeteriaMenu::class, 'cafeteria_menu_id');
    }
}
