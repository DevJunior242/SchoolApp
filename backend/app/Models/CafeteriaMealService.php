<?php

namespace App\Models;

use App\Models\CafeteriaMenu;
use App\Models\CafeteriaMenuItem;
use App\Models\FeeStructure;
use App\Models\School;
use App\Models\Student;
use App\Models\User;
use App\Models\WalletTransaction;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CafeteriaMealService extends Model
{
    use HasUuids;

    const COVERED_BY_WALLET = 1;

    const COVERED_BY_SUBSCRIPTION = 2;

    protected $fillable = [
        'school_id', 'student_id', 'cafeteria_menu_id', 'cafeteria_menu_item_id',
        'served_at', 'served_by', 'covered_by', 'wallet_transaction_id', 'fee_structure_id',
    ];

    protected function casts(): array
    {
        return ['served_at' => 'datetime'];
    }

    public function school(): BelongsTo
    {
        return $this->belongsTo(School::class);
    }

    public function student(): BelongsTo
    {
        return $this->belongsTo(Student::class);
    }

    public function menu(): BelongsTo
    {
        return $this->belongsTo(CafeteriaMenu::class, 'cafeteria_menu_id');
    }

    public function menuItem(): BelongsTo
    {
        return $this->belongsTo(CafeteriaMenuItem::class, 'cafeteria_menu_item_id');
    }

    public function servedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'served_by');
    }

    public function walletTransaction(): BelongsTo
    {
        return $this->belongsTo(WalletTransaction::class);
    }

    public function feeStructure(): BelongsTo
    {
        return $this->belongsTo(FeeStructure::class);
    }
}
