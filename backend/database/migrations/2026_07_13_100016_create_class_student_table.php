<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('class_student', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('class_id')->constrained('classes')->cascadeOnDelete();
            $table->foreignUuid('student_id')->constrained('students')->cascadeOnDelete();
            $table->foreignUuid('season_id')->constrained()->cascadeOnDelete();
            $table->tinyInteger('status')->default(1);
            $table->timestamps();

            $table->index(['class_id', 'student_id', 'season_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('class_student');
    }
};
