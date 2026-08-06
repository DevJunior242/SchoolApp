<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('treasury_movements', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('school_id')->constrained()->cascadeOnDelete();
            $table->foreignUuid('treasury_account_id')->constrained()->cascadeOnDelete();
            // DEPOSIT / WITHDRAWAL / TRANSFER_IN / TRANSFER_OUT / ADJUSTMENT
            // — uniquement les mouvements sans origine élève (Payment) ou
            // fournisseur (Expense) : virement interne, subvention reçue
            // directement, frais bancaires, correction de solde.
            $table->string('type');
            $table->decimal('amount', 12, 2);
            $table->text('note')->nullable();
            $table->foreignUuid('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->index(['treasury_account_id', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('treasury_movements');
    }
};
