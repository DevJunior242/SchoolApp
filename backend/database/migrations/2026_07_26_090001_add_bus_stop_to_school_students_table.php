<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * L'affectation à un arrêt de bus est propre à l'école (comme le
     * portefeuille cantine), pas à l'élève globalement.
     */
    public function up(): void
    {
        Schema::table('school_students', function (Blueprint $table) {
            $table->foreignUuid('bus_stop_id')->nullable()->after('student_id')->constrained()->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('school_students', function (Blueprint $table) {
            $table->dropConstrainedForeignId('bus_stop_id');
        });
    }
};
