<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Lien « QR seul » pour l'appareil de l'accueil (repris d'Intellino RH) :
     * aucun compte n'y reste connecté. Jeton chiffré (réaffichable) +
     * empreinte (recherche).
     */
    public function up(): void
    {
        Schema::table('school_staff_attendance_settings', function (Blueprint $table) {
            $table->text('kiosk_token')->nullable()->after('printed_token_generated_at');
            $table->string('kiosk_token_hash', 64)->nullable()->unique()->after('kiosk_token');
            $table->dateTime('kiosk_token_generated_at')->nullable()->after('kiosk_token_hash');
        });
    }

    public function down(): void
    {
        Schema::table('school_staff_attendance_settings', function (Blueprint $table) {
            $table->dropUnique(['kiosk_token_hash']);
            $table->dropColumn(['kiosk_token', 'kiosk_token_hash', 'kiosk_token_generated_at']);
        });
    }
};
