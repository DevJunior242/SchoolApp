<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('school_payroll_entries', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->foreignUuid('school_id')->constrained()->cascadeOnDelete();
            $table->foreignUuid('user_id')->constrained()->cascadeOnDelete();
            $table->foreignUuid('type_id')->constrained('school_payroll_types')->cascadeOnDelete();
            $table->string('period', 7);
            $table->string('label');
            $table->decimal('amount', 12, 2)->default(0);
            $table->text('note')->nullable();
            $table->foreignUuid('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->index(['school_id', 'user_id', 'period']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('school_payroll_entries');
    }
};
