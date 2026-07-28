<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('marketplace_plans', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->tinyInteger('period');
            $table->decimal('amount', 12, 2);
            $table->string('currency')->default('FCFA');
            $table->boolean('active')->default(true);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('marketplace_plans');
    }
};
