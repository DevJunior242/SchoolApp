<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
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

        $defaults = [
            ['ecole', 'École', 25000, null, true, false, false, 0, 5, ['basic']],
            ['etablissement', 'Établissement', 60000, null, true, false, false, 0, null, ['basic', 'ai', 'library', 'cafeteria', 'health', 'buses']],
            ['reseau', 'Réseau scolaire', 120000, null, true, false, false, 0, null, ['basic', 'ai', 'library', 'cafeteria', 'health', 'buses']],
        ];

        foreach ($defaults as [$slug, $name, $monthlyAmount, $annualBaseAmount, $monthlyEnabled, $annualEnabled, $discountEnabled, $discountPercentage, $maxStaff, $modules]) {
            $id = (string) Illuminate\Support\Str::uuid();
            DB::table('school_pricing_plans')->insert([
                'id' => $id,
                'name' => $name,
                'slug' => $slug,
                'monthly_amount' => $monthlyAmount,
                'annual_base_amount' => $annualBaseAmount,
                'monthly_enabled' => $monthlyEnabled,
                'annual_enabled' => $annualEnabled,
                'annual_discount_enabled' => $discountEnabled,
                'annual_discount_percentage' => $discountPercentage,
                'currency' => 'FCFA',
                'max_staff_accounts' => $maxStaff,
                'modules' => json_encode($modules),
                'active' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            DB::table('schools')->where('plan', $slug)->update(['pricing_plan_id' => $id]);
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('school_pricing_plans');
    }
};
