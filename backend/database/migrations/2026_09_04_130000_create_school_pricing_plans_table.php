<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('school_pricing_plans', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('name', 100);
            $table->string('slug', 120)->unique();
            $table->decimal('monthly_amount', 12, 2)->default(0);
            $table->string('currency', 10)->default('FCFA');
            $table->unsignedInteger('max_staff_accounts')->nullable();
            $table->json('modules');
            $table->boolean('active')->default(true);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('school_pricing_plans');
    }
};
