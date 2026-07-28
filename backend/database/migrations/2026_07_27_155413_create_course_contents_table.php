<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('course_contents', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('class_subject_teacher_id')->constrained('class_subject_teacher')->cascadeOnDelete();
            $table->tinyInteger('category');
            $table->string('title');
            $table->text('description')->nullable();
            $table->string('video_url')->nullable();
            $table->string('file_path')->nullable();
            $table->string('correction_path')->nullable();
            $table->timestamps();

            $table->index('class_subject_teacher_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('course_contents');
    }
};
