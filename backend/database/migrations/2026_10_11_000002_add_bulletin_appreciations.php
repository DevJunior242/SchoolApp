<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Bulletins, étape 2 : titulaire de la classe, appréciations (par matière
 * par le professeur, générale par le titulaire ou le directeur) et options
 * d'affichage des appréciations et des absences.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('classes', function (Blueprint $table) {
            $table->foreignUuid('head_teacher_id')->nullable()->after('name')->constrained('users')->nullOnDelete();
        });

        Schema::create('bulletin_appreciations', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('school_id')->constrained()->cascadeOnDelete();
            $table->foreignUuid('student_id')->constrained()->cascadeOnDelete();
            $table->foreignUuid('class_id')->constrained('classes')->cascadeOnDelete();
            // Vide = appréciation générale (titulaire / directeur).
            $table->foreignUuid('class_subject_teacher_id')->nullable()->constrained('class_subject_teacher')->cascadeOnDelete();
            // Vide = bulletin annuel.
            $table->foreignUuid('season_id')->nullable()->constrained()->cascadeOnDelete();
            $table->string('content', 500);
            $table->foreignUuid('author_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->index(['class_id', 'season_id']);
        });

        Schema::table('bulletin_templates', function (Blueprint $table) {
            $table->boolean('show_appreciations')->default(true)->after('show_rank');
            $table->boolean('show_attendance')->default(true)->after('show_appreciations');
        });
    }

    public function down(): void
    {
        Schema::table('bulletin_templates', function (Blueprint $table) {
            $table->dropColumn(['show_appreciations', 'show_attendance']);
        });
        Schema::dropIfExists('bulletin_appreciations');
        Schema::table('classes', function (Blueprint $table) {
            $table->dropConstrainedForeignId('head_teacher_id');
        });
    }
};
