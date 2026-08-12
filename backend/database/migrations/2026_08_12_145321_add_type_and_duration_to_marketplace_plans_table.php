<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('marketplace_plans', function (Blueprint $table) {
            // 1=abonnement annuaire (existant, utilise period mensuel/
            // annuel), 2=boost produit (utilise duration_days, ignore
            // period). Défaut à 1 pour que les formules déjà en base
            // restent des abonnements sans migration de données.
            $table->tinyInteger('type')->default(1)->after('id');
            $table->unsignedInteger('duration_days')->nullable()->after('period');
        });
    }

    public function down(): void
    {
        Schema::table('marketplace_plans', function (Blueprint $table) {
            $table->dropColumn(['type', 'duration_days']);
        });
    }
};
