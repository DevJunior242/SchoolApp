<?php

use Illuminate\Support\Facades\Schema;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Database\Migrations\Migration;

return new class extends Migration
{
        public function up(): void
        {
            Schema::create('fee_structures', function (Blueprint $table) {
                $table->uuid('id')->primary();
                $table->foreignUuid('school_id')->constrained()->cascadeOnDelete();
                $table->foreignUuid('level_id')->nullable()->constrained()->cascadeOnDelete();
                $table->foreignUuid('season_id')->nullable()->constrained()->cascadeOnDelete();
                $table->foreignUuid('school_year_id')->constrained()->cascadeOnDelete();
                 
                $table->tinyInteger('category')->default(1);
                $table->string('label');
                $table->decimal('amount', 10, 2);
                $table->date('due_date')->nullable();
                $table->unsignedSmallInteger('order')->nullable();
                $table->timestamps();

                $table->index(['school_id', 'level_id', 'school_year_id']);
            });
    }

    public function down(): void
    {
        Schema::dropIfExists('fee_structures');
    }
};
