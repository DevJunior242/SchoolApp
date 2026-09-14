<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('exam_results', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('exam_id')->constrained('exams')->cascadeOnDelete();
            $table->foreignUuid('exam_candidate_id')->constrained('exam_candidates')->cascadeOnDelete();
            $table->decimal('total_score', 8, 2)->nullable();
            $table->decimal('average', 8, 2)->nullable();
            $table->unsignedInteger('rank')->nullable();
            $table->string('status')->default('pending');
            $table->boolean('is_validated')->default(false);
            $table->timestamp('validated_at')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->unique(['exam_id', 'exam_candidate_id']);
            $table->index(['exam_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('exam_results');
    }
};
