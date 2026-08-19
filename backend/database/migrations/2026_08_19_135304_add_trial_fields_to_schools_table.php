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
        Schema::table('schools', function (Blueprint $table) {
            // Null = pas de limite d'essai (clé d'activation utilisée, ou
            // réactivée manuellement par le superadmin après paiement).
            $table->timestamp('trial_ends_at')->nullable()->after('status');
            $table->timestamp('trial_reminder_sent_at')->nullable()->after('trial_ends_at');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('schools', function (Blueprint $table) {
            $table->dropColumn(['trial_ends_at', 'trial_reminder_sent_at']);
        });
    }
};
