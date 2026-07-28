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
            // Le poids de la matière dans la moyenne générale de la classe
            // (ex: Maths coef 4, Musique coef 1) — propre à cette affectation
            // classe+matière, pas à la matière elle-même.
            $table->decimal('coefficient', 4, 2)->default(1);
            $table->timestamps();

            $table->index(['class_id', 'subject_id', 'user_id'], 'cst_class_subject_user_idx');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('class_subject_teacher');
    }
};
