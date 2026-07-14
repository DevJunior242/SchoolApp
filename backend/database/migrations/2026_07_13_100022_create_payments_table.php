<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('payments', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('school_id')->constrained()->cascadeOnDelete();
            $table->foreignUuid('student_id')->constrained('students')->cascadeOnDelete();
            $table->foreignUuid('fee_structure_id')->constrained()->cascadeOnDelete();
            $table->foreignUuid('payment_method_id')->constrained()->cascadeOnDelete();
            $table->decimal('amount', 10, 2);
            $table->string('sender_number');
            $table->string('transaction_id')->nullable();
            $table->tinyInteger('status')->default(0);
            $table->foreignUuid('declared_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignUuid('confirmed_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('confirmed_at')->nullable();
            $table->timestamps();

            $table->index(['school_id', 'student_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('payments');
    }
};
