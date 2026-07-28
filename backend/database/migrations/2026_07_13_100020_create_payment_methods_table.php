<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('payment_methods', function (Blueprint $table) {
            $table->uuid('id')->primary();
            // Nullable : un moyen de paiement sans école est un moyen de
            // paiement plateforme (abonnement marketplace, géré par le
            // superadmin), pas un moyen de paiement d'école.
            $table->foreignUuid('school_id')->nullable()->constrained()->cascadeOnDelete();
            $table->string('name');
            $table->string('number')->nullable();
            $table->text('instructions')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('payment_methods');
    }
};
