<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TreasuryMovement extends Model
{
    use HasUuids;

    const TYPE_DEPOSIT = 'DEPOSIT';

    const TYPE_WITHDRAWAL = 'WITHDRAWAL';

    const TYPE_TRANSFER_IN = 'TRANSFER_IN';

    const TYPE_TRANSFER_OUT = 'TRANSFER_OUT';

    const TYPE_ADJUSTMENT = 'ADJUSTMENT';

    // Types qui augmentent le solde du compte ; les autres le diminuent.
    const CREDIT_TYPES = [self::TYPE_DEPOSIT, self::TYPE_TRANSFER_IN];

    protected $fillable = [
        'school_id', 'treasury_account_id', 'type', 'amount', 'note', 'created_by',
    ];

    protected function casts(): array
    {
        return ['amount' => 'decimal:2'];
    }

    public function school(): BelongsTo
    {
        return $this->belongsTo(School::class);
    }

    public function treasuryAccount(): BelongsTo
    {
        return $this->belongsTo(TreasuryAccount::class);
    }

    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
