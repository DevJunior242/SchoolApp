<?php

use Illuminate\Support\Facades\Schema;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Database\Migrations\Migration;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('treasury_accounts', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('school_id')->constrained()->cascadeOnDelete();
            $table->foreignUuid('section_id')->nullable()->constrained()->nullOnDelete();
            $table->string('name');
            // CASH (caisse) ou BANK (compte bancaire) : détermine juste le
            // pictogramme/regroupement à l'affichage, le calcul de solde est
            // identique pour les deux types.
            $table->string('type');
            $table->string('bank_name')->nullable();
            $table->decimal('opening_balance', 12, 2)->default(0);
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->index(['school_id', 'is_active']);
            $table->index(['school_id', 'section_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('treasury_accounts');
    }
};
