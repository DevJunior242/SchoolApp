<?php

use Illuminate\Support\Facades\Schema;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Database\Migrations\Migration;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('school_pricing_plans', function (Blueprint $table) {
            $table->boolean('monthly_enabled')->default(true)->after('monthly_amount');
            $table->boolean('annual_enabled')->default(false)->after('monthly_enabled');
            $table->decimal('annual_discount_percentage', 5, 2)->default(0)->after('annual_enabled');
        });
    }

    public function down(): void
    {
        Schema::table('school_pricing_plans', function (Blueprint $table) {
            $table->dropColumn([
                'monthly_enabled',
                'annual_enabled',
                'annual_discount_percentage',
            ]);
        });
    }
};
