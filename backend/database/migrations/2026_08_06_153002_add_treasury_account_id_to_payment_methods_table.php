<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('payment_methods', function (Blueprint $table) {
            // Nullable : un moyen de paiement pas encore rattaché à un
            // compte de trésorerie (ou un moyen plateforme, sans école) ne
            // doit pas bloquer les paiements déjà en place.
            $table->foreignUuid('treasury_account_id')->nullable()->after('school_id')
                ->constrained()->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('payment_methods', function (Blueprint $table) {
            $table->dropConstrainedForeignId('treasury_account_id');
        });
    }
};
