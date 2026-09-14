<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('exam_result_details', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('exam_result_id')->constrained('exam_results')->cascadeOnDelete();
            $table->foreignUuid('exam_subject_id')->constrained('exam_subjects')->cascadeOnDelete();
            $table->decimal('subject_score', 8, 2)->nullable();
            $table->decimal('coefficient', 8, 2)->default(1);
            $table->boolean('is_absent')->default(false);
            $table->text('remark')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->unique(['exam_result_id', 'exam_subject_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('exam_result_details');
    }
};
