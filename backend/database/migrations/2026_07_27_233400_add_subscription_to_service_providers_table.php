<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('service_providers', function (Blueprint $table) {
            $table->foreignUuid('user_id')->nullable()->unique()->after('id')->constrained()->cascadeOnDelete();
            $table->date('subscription_expires_at')->nullable()->after('status');
        });
    }

    public function down(): void
    {
        Schema::table('service_providers', function (Blueprint $table) {
            $table->dropConstrainedForeignId('user_id');
            $table->dropColumn('subscription_expires_at');
        });
    }
};
