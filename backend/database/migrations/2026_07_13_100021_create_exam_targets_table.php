<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('exam_targets', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('exam_id')->constrained('exams')->cascadeOnDelete();
            $table->foreignUuid('section_id')->nullable()->constrained('sections')->nullOnDelete();
            $table->foreignUuid('level_id')->nullable()->constrained('levels')->nullOnDelete();
            $table->foreignUuid('school_class_id')->nullable()->constrained('classes')->nullOnDelete();
            $table->string('target_type')->default('class');
            $table->text('remarks')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->index(['exam_id', 'target_type']);
            $table->index(['section_id', 'level_id', 'school_class_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('exam_targets');
    }
};
