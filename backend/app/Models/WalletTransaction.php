<?php

namespace App\Models;

use App\Models\PaymentMethod;
use App\Models\StudentWallet;
use App\Models\User;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class WalletTransaction extends Model
{
    use HasUuids;

    const TYPE_RECHARGE = 1;

    const TYPE_DEBIT = 2;

    const STATUS_PENDING = 0;

    const STATUS_CONFIRMED = 1;

    const STATUS_REJECTED = 2;

    protected $fillable = [
        'student_wallet_id', 'type', 'amount', 'status', 'payment_method_id',
        'sender_number', 'transaction_id', 'declared_by', 'confirmed_by',
        'confirmed_at', 'notes',
    ];

    protected function casts(): array
    {
        return [
            'amount' => 'decimal:2',
            'confirmed_at' => 'datetime',
        ];
    }

    public function wallet(): BelongsTo
    {
        return $this->belongsTo(StudentWallet::class, 'student_wallet_id');
    }

    public function paymentMethod(): BelongsTo
    {
        return $this->belongsTo(PaymentMethod::class);
    }

    public function declaredBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'declared_by');
    }

    public function confirmedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'confirmed_by');
    }
}
