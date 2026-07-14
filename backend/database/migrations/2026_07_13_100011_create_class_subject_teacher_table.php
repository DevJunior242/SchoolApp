<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('class_subject_teacher', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('class_id')->constrained()->cascadeOnDelete();
            $table->foreignUuid('subject_id')->constrained()->cascadeOnDelete();
            $table->foreignUuid('user_id')->constrained()->cascadeOnDelete();
            $table->foreignUuid('season_id')->constrained()->cascadeOnDelete();
            $table->timestamps();

            $table->index(['class_id', 'subject_id', 'user_id', 'season_id'], 'cst_class_subject_user_season_idx');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('class_subject_teacher');
    }
};
