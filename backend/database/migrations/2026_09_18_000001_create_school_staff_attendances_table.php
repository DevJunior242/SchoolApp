<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('school_staff_attendances', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->foreignUuid('school_id')->constrained()->cascadeOnDelete();
            $table->foreignUuid('user_id')->constrained()->cascadeOnDelete();
            $table->date('attendance_date');
            $table->dateTime('check_in')->nullable();
            $table->dateTime('check_out')->nullable();
            $table->string('check_in_source', 20)->nullable();
            $table->string('check_out_source', 20)->nullable();
            $table->text('correction_reason')->nullable();
            $table->foreignUuid('corrected_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('corrected_at')->nullable();
            $table->timestamps();

            $table->unique(['school_id', 'user_id', 'attendance_date'], 'staff_attendance_day_unique');
            $table->index(['school_id', 'attendance_date']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('school_staff_attendances');
    }
};
