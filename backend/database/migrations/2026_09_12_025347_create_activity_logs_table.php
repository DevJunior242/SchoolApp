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
        Schema::create('activity_logs', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('action'); // created, updated, deleted
            $table->string('model'); // School, Section, TreasuryAccount, etc
            $table->uuid('model_id');
            $table->uuid('user_id')->nullable(); // Qui a fait l'action
            $table->uuid('school_id')->nullable(); // Contexte école
            $table->json('old_values')->nullable(); // Avant
            $table->json('new_values')->nullable(); // Après
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('activity_logs');
    }
};
