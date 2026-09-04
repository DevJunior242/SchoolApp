<?php

use App\Models\School;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('schools', function (Blueprint $table) {
            $table->foreignUuid('pricing_plan_id')->nullable()->after('plan')->constrained('school_pricing_plans')->nullOnDelete();
        });

        $defaults = [
            [School::PLAN_ECOLE, 'École', 25000, 5, ['basic']],
            [School::PLAN_ETABLISSEMENT, 'Établissement', 60000, null, ['basic', 'ai', 'library', 'cafeteria', 'health', 'buses']],
            [School::PLAN_RESEAU, 'Réseau scolaire', 120000, null, ['basic', 'ai', 'library', 'cafeteria', 'health', 'buses']],
        ];

        foreach ($defaults as [$slug, $name, $amount, $maxStaff, $modules]) {
            $id = (string) Str::uuid();
            DB::table('school_pricing_plans')->insert([
                'id' => $id,
                'name' => $name,
                'slug' => $slug,
                'monthly_amount' => $amount,
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
        Schema::table('schools', function (Blueprint $table) {
            $table->dropForeign(['pricing_plan_id']);
            $table->dropColumn('pricing_plan_id');
        });
    }
};
