<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Données demandées par l'inspection : élèves déplacés internes (PDI),
 * en situation de handicap, et redoublants (propre à une année / classe,
 * donc sur class_student).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('students', function (Blueprint $table) {
            $table->boolean('is_displaced')->default(false)->after('matricule');
            $table->string('displaced_origin', 150)->nullable()->after('is_displaced');
            $table->boolean('has_disability')->default(false)->after('displaced_origin');
            $table->string('disability_type', 30)->nullable()->after('has_disability');
        });

        Schema::table('class_student', function (Blueprint $table) {
            $table->boolean('is_repeating')->default(false)->after('status');
        });
    }

    public function down(): void
    {
        Schema::table('class_student', function (Blueprint $table) {
            $table->dropColumn('is_repeating');
        });

        Schema::table('students', function (Blueprint $table) {
            $table->dropColumn(['is_displaced', 'displaced_origin', 'has_disability', 'disability_type']);
        });
    }
};
