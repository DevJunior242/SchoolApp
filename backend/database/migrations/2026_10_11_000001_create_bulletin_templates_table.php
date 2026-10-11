<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Modèle de bulletin propre à chaque section d'une école : barème, calcul,
 * colonnes affichées, distinctions, décision de fin d'année, en-tête et
 * signatures. Sans ligne pour une section : valeurs par défaut
 * (BulletinTemplate::DEFAULTS).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('bulletin_templates', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('school_id')->constrained()->cascadeOnDelete();
            $table->foreignUuid('section_id')->constrained()->cascadeOnDelete();
            $table->unsignedTinyInteger('grading_scale')->default(20);
            $table->string('calculation_mode', 20)->default('grade_coefficient');
            $table->json('evaluation_weights')->nullable();
            $table->decimal('pass_threshold', 5, 2)->nullable();
            $table->string('pass_label', 100)->nullable();
            $table->string('fail_label', 100)->nullable();
            $table->json('distinctions')->nullable();
            $table->boolean('show_teacher')->default(true);
            $table->boolean('show_coefficient')->default(true);
            $table->boolean('show_class_average')->default(true);
            $table->boolean('show_min_max')->default(false);
            $table->boolean('show_subject_rank')->default(false);
            $table->boolean('show_rank')->default(true);
            $table->json('header_lines')->nullable();
            $table->string('motto', 150)->nullable();
            $table->json('signatures')->nullable();
            $table->timestamps();

            $table->unique(['school_id', 'section_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('bulletin_templates');
    }
};
