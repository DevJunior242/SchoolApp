<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('cafeteria_menus', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('school_id')->constrained()->cascadeOnDelete();
            $table->date('date');
            $table->foreignUuid('created_by')->constrained('users')->cascadeOnDelete();
            $table->timestamps();

            $table->unique(['school_id', 'date']);
        });

        Schema::create('cafeteria_menu_items', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('cafeteria_menu_id')->constrained()->cascadeOnDelete();
            $table->string('label');
            $table->decimal('price', 10, 2);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('cafeteria_menu_items');
        Schema::dropIfExists('cafeteria_menus');
    }
};
