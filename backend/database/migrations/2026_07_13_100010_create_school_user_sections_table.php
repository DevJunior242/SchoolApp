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
        Schema::create('school_user_sections', function (Blueprint $table) {
           $table->uuid('id')->primary();
            $table->foreignUuid('school_user_id')->constrained('school_users')->cascadeOnDelete();
            $table->foreignUuid('section_id')->constrained('sections')->cascadeOnDelete();
            $table->timestamps();

            $table->unique(['school_user_id', 'section_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('school_user_sections');
    }
};
