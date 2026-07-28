<?php

namespace App\Models;

use App\Models\School;
use App\Models\Student;
use App\Models\WalletTransaction;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class StudentWallet extends Model
{
    use HasUuids;

    protected $fillable = ['school_id', 'student_id', 'balance', 'low_balance_notified'];

    protected function casts(): array
    {
        return [
            'balance' => 'decimal:2',
            'low_balance_notified' => 'boolean',
        ];
    }

    public function school(): BelongsTo
    {
        return $this->belongsTo(School::class);
    }

    public function student(): BelongsTo
    {
        return $this->belongsTo(Student::class);
    }

    public function transactions(): HasMany
    {
        return $this->hasMany(WalletTransaction::class);
    }
}
