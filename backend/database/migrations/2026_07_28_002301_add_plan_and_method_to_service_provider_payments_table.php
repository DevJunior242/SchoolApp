<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('service_provider_payments', function (Blueprint $table) {
            $table->foreignUuid('marketplace_plan_id')->nullable()->after('service_provider_id')->constrained()->nullOnDelete();
            $table->foreignUuid('payment_method_id')->nullable()->after('marketplace_plan_id')->constrained()->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('service_provider_payments', function (Blueprint $table) {
            $table->dropConstrainedForeignId('marketplace_plan_id');
            $table->dropConstrainedForeignId('payment_method_id');
        });
    }
};
