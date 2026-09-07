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
            $table->decimal('annual_base_amount', 12, 2)->nullable();
            $table->boolean('monthly_enabled')->default(true);
            $table->boolean('annual_enabled')->default(false);
            $table->boolean('annual_discount_enabled')->default(false);
            $table->decimal('annual_discount_percentage', 5, 2)->default(0);
            $table->string('currency', 10)->default('FCFA');
            $table->unsignedInteger('max_staff_accounts')->nullable();
            $table->json('modules');
            $table->boolean('active')->default(true);
            $table->timestamps();
        });

        Schema::table('schools', function (Blueprint $table) {
            $table->foreign('pricing_plan_id')->references('id')->on('school_pricing_plans')->nullOnDelete();
        });

    }

    public function down(): void
    {
        Schema::dropIfExists('school_pricing_plans');
    }
};
