<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('expenses', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('school_id')->constrained()->cascadeOnDelete();
            $table->foreignUuid('expense_category_id')->constrained()->cascadeOnDelete();
            // Nullable : une dépense peut être déclarée avant qu'on sache
            // sur quel compte elle a été payée (ex: en attente de
            // confirmation), tout comme payment_method_id sur Payment.
            $table->foreignUuid('treasury_account_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignUuid('payment_method_id')->nullable()->constrained()->nullOnDelete();
            $table->decimal('amount', 10, 2);
            $table->string('supplier_name')->nullable();
            $table->text('description')->nullable();
            $table->date('expense_date');
            $table->string('receipt_path')->nullable();
            $table->tinyInteger('status')->default(0);
            $table->foreignUuid('declared_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignUuid('confirmed_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('confirmed_at')->nullable();
            $table->timestamps();

            $table->index(['school_id', 'status']);
            $table->index(['school_id', 'expense_date']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('expenses');
    }
};
