<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('treasury_accounts', function (Blueprint $table) {
            // Pertinent seulement pour un compte de type BANK (nom de la
            // banque : Ecobank, UBA...) ; laissé vide pour une caisse.
            $table->string('bank_name')->nullable()->after('type');
        });
    }

    public function down(): void
    {
        Schema::table('treasury_accounts', function (Blueprint $table) {
            $table->dropColumn('bank_name');
        });
    }
};
