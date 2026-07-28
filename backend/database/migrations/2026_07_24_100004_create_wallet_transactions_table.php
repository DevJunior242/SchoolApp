<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('wallet_transactions', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('student_wallet_id')->constrained()->cascadeOnDelete();
            $table->tinyInteger('type');
            $table->decimal('amount', 10, 2);
            // Une recharge passe par pending -> confirmed/rejected (comptable) ;
            // un débit (repas) est confirmé immédiatement, pas d'attente.
            $table->tinyInteger('status')->default(1);
            $table->foreignUuid('payment_method_id')->nullable()->constrained()->nullOnDelete();
            $table->string('sender_number')->nullable();
            $table->string('transaction_id')->nullable();
            $table->foreignUuid('declared_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignUuid('confirmed_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('confirmed_at')->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();

            $table->index(['student_wallet_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('wallet_transactions');
    }
};
