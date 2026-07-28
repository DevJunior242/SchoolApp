<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('service_provider_items', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('service_provider_id')->constrained()->cascadeOnDelete();
            $table->string('name');
            $table->text('description')->nullable();
            $table->decimal('price', 12, 2)->nullable();
            // Chemin sur le disque public (comme School.logo), pas un lien
            // externe : un prestataire n'a en général aucune photo déjà
            // hébergée avec une URL à copier-coller.
            $table->string('image_path')->nullable();
            $table->timestamps();

            $table->index('service_provider_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('service_provider_items');
    }
};
