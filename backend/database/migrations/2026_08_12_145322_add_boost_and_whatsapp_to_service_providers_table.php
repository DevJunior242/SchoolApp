<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('service_providers', function (Blueprint $table) {
            $table->date('boosted_until')->nullable()->after('subscription_expires_at');
            $table->string('whatsapp_number')->nullable()->after('email');
        });
    }

    public function down(): void
    {
        Schema::table('service_providers', function (Blueprint $table) {
            $table->dropColumn(['boosted_until', 'whatsapp_number']);
        });
    }
};
