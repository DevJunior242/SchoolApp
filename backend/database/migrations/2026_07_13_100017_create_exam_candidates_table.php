<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('exam_candidates', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('exam_id')->constrained('exams')->cascadeOnDelete();
            $table->foreignUuid('student_id')->constrained('students')->cascadeOnDelete();
            $table->foreignUuid('school_class_id')->nullable()->constrained('classes')->nullOnDelete();
            $table->string('candidate_number')->nullable();
            $table->string('attendance_status')->default('present');
            $table->boolean('is_absent')->default(false);
            $table->text('remarks')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->unique(['exam_id', 'student_id']);
            $table->index(['exam_id', 'school_class_id']);
            $table->index(['exam_id', 'attendance_status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('exam_candidates');
    }
};
