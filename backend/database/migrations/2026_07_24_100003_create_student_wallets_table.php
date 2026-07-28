<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('student_wallets', function (Blueprint $table) {
            $table->uuid('id')->primary();
            // Scopé par école (comme les paiements), pas global comme la
            // fiche santé : un solde prépayé est de l'argent réel confié à
            // un établissement précis, il ne doit pas suivre silencieusement
            // l'élève s'il change d'école.
            $table->foreignUuid('school_id')->constrained()->cascadeOnDelete();
            $table->foreignUuid('student_id')->constrained()->cascadeOnDelete();
            $table->decimal('balance', 10, 2)->default(0);
            // Évite de renotifier à chaque repas tant que le solde reste bas :
            // remis à false dès qu'une recharge est confirmée.
            $table->boolean('low_balance_notified')->default(false);
            $table->timestamps();

            $table->unique(['school_id', 'student_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('student_wallets');
    }
};
