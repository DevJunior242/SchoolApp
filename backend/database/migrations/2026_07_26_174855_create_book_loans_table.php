<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('book_loans', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('school_id')->constrained()->cascadeOnDelete();
            $table->foreignUuid('book_copy_id')->constrained()->cascadeOnDelete();
            $table->foreignUuid('student_id')->constrained()->cascadeOnDelete();
            $table->tinyInteger('status')->default(1);
            $table->dateTime('borrowed_at');
            $table->date('due_at');
            $table->dateTime('returned_at')->nullable();
            $table->foreignUuid('issued_by')->constrained('users')->cascadeOnDelete();
            $table->foreignUuid('returned_to')->nullable()->constrained('users')->nullOnDelete();
            $table->boolean('due_soon_notified')->default(false);
            $table->boolean('overdue_notified')->default(false);
            $table->timestamps();

            $table->index(['school_id', 'status']);
            $table->index('student_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('book_loans');
    }
};
