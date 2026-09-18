<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('school_staff_profiles')) {
            return;
        }

        Schema::table('school_staff_profiles', function (Blueprint $table): void {
            if (! Schema::hasColumn('school_staff_profiles', 'contract_start_date')) {
                $table->date('contract_start_date')->nullable()->after('hire_date');
            }

            if (! Schema::hasColumn('school_staff_profiles', 'contract_end_date')) {
                $table->date('contract_end_date')->nullable()->after('contract_start_date');
            }
        });
    }

    public function down(): void
    {
        if (! Schema::hasTable('school_staff_profiles')) {
            return;
        }

        Schema::table('school_staff_profiles', function (Blueprint $table): void {
            if (Schema::hasColumn('school_staff_profiles', 'contract_end_date')) {
                $table->dropColumn('contract_end_date');
            }

            if (Schema::hasColumn('school_staff_profiles', 'contract_start_date')) {
                $table->dropColumn('contract_start_date');
            }
        });
    }
};
