<?php

use Illuminate\Support\Facades\Schema;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Database\Migrations\Migration;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('levels', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('section_id')->constrained('sections')->cascadeOnDelete();
            $table->string('name');
            $table->string('code');
            $table->unsignedInteger('order')->default(0);
            $table->timestamps();

            $table->unique(['section_id', 'code']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('levels');
    }
};
