<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('exam_candidate_subjects', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('exam_candidate_id')->constrained('exam_candidates')->cascadeOnDelete();
            $table->foreignUuid('exam_subject_id')->constrained('exam_subjects')->cascadeOnDelete();
            $table->decimal('score', 8, 2)->nullable();
            $table->decimal('score_out_of', 8, 2)->nullable();
            $table->boolean('is_absent')->default(false);
            $table->text('remark')->nullable();
            $table->timestamp('validated_at')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->unique(['exam_candidate_id', 'exam_subject_id']);
            $table->index(['exam_candidate_id', 'is_absent']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('exam_candidate_subjects');
    }
};
