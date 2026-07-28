<?php

namespace App\Models;

use App\Models\ServiceProvider;
use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ServiceProviderItem extends Model
{
    use HasUuids;

    protected $fillable = ['service_provider_id', 'name', 'description', 'price', 'image_path'];

    protected $appends = ['image_url'];

    protected function casts(): array
    {
        return [
            'price' => 'decimal:2',
        ];
    }

    protected function imageUrl(): Attribute
    {
        return Attribute::make(get: fn () => $this->image_path ? asset('storage/'.$this->image_path) : null);
    }

    public function serviceProvider(): BelongsTo
    {
        return $this->belongsTo(ServiceProvider::class);
    }
}
