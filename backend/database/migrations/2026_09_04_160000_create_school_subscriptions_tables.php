<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('school_subscriptions', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('school_id')->constrained()->cascadeOnDelete();
            $table->foreignUuid('school_pricing_plan_id')->constrained('school_pricing_plans');
            $table->foreignUuid('created_by')->constrained('users');
            $table->string('billing_cycle', 20);
            $table->decimal('amount', 12, 2);
            $table->string('currency', 10);
            $table->string('status', 30)->index();
            $table->timestamp('starts_at')->nullable();
            $table->timestamp('ends_at')->nullable();
            $table->timestamps();
        });

        Schema::create('school_subscription_payments', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('school_subscription_id')->constrained()->cascadeOnDelete();
            $table->foreignUuid('payment_method_id')->nullable()->constrained()->nullOnDelete();
            $table->string('sender_number', 50);
            $table->string('transaction_id', 120)->nullable();
            $table->string('status', 30)->index();
            $table->foreignUuid('reviewed_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('reviewed_at')->nullable();
            $table->text('rejection_reason')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('school_subscription_payments');
        Schema::dropIfExists('school_subscriptions');
    }
};
