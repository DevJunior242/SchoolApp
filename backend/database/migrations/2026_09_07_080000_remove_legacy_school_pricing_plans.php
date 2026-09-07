<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    private const LEGACY_SLUGS = ['ecole', 'etablissement', 'reseau'];

    public function up(): void
    {
        $planIds = DB::table('school_pricing_plans')
            ->whereIn('slug', self::LEGACY_SLUGS)
            ->pluck('id');

        if ($planIds->isEmpty()) {
            return;
        }

        if (
            DB::table('schools')->whereIn('pricing_plan_id', $planIds)->exists()
            || DB::table('school_subscriptions')->whereIn('school_pricing_plan_id', $planIds)->exists()
        ) {
            throw new RuntimeException('Les anciens plans de pricing sont encore utilisés et ne peuvent pas être supprimés automatiquement.');
        }

        DB::table('school_pricing_plans')->whereIn('id', $planIds)->delete();
    }

    public function down(): void
    {
        // Les plans supprimés doivent être recréés par le superadmin.
    }
};
