<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Sessions (jetons Sanctum) : appareil et adresse IP de connexion, pour la
 * liste « Appareils connectés ». Appareils déjà vus par compte : une connexion
 * depuis un appareil inconnu envoie une alerte par e-mail.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('personal_access_tokens', function (Blueprint $table) {
            $table->string('ip_address', 45)->nullable()->after('abilities');
            $table->string('user_agent', 512)->nullable()->after('ip_address');
            $table->string('device_hash', 64)->nullable()->after('user_agent');
            // Dernière utilisation : un jeton volé utilisé ailleurs se voit ici.
            $table->string('last_ip', 45)->nullable()->after('device_hash');
            $table->string('last_user_agent', 512)->nullable()->after('last_ip');
            $table->dateTime('flagged_at')->nullable()->after('last_user_agent');
        });

        Schema::create('login_devices', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('user_id')->constrained()->cascadeOnDelete();
            $table->string('device_hash', 64);
            $table->string('label', 120)->nullable();
            $table->string('last_ip', 45)->nullable();
            $table->dateTime('first_seen_at');
            $table->dateTime('last_seen_at');
            $table->timestamps();

            $table->unique(['user_id', 'device_hash']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('login_devices');

        Schema::table('personal_access_tokens', function (Blueprint $table) {
            $table->dropColumn(['ip_address', 'user_agent', 'device_hash', 'last_ip', 'last_user_agent', 'flagged_at']);
        });
    }
};
