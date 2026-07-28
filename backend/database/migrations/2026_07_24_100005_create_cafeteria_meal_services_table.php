<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('cafeteria_meal_services', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('school_id')->constrained()->cascadeOnDelete();
            $table->foreignUuid('student_id')->constrained()->cascadeOnDelete();
            $table->foreignUuid('cafeteria_menu_id')->constrained()->cascadeOnDelete();
            $table->foreignUuid('cafeteria_menu_item_id')->constrained()->cascadeOnDelete();
            $table->dateTime('served_at');
            $table->foreignUuid('served_by')->constrained('users')->cascadeOnDelete();
            $table->tinyInteger('covered_by');
            $table->foreignUuid('wallet_transaction_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignUuid('fee_structure_id')->nullable()->constrained()->nullOnDelete();
            $table->timestamps();

            // Un seul repas par élève et par jour (le menu est déjà daté).
            $table->unique(['student_id', 'cafeteria_menu_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('cafeteria_meal_services');
    }
};
