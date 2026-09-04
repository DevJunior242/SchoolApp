<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('schools', function (Blueprint $table) {
            $table->timestamp('staff_quota_deadline_at')->nullable()->after('trial_reminder_sent_at');
            $table->timestamp('staff_quota_reminder_sent_at')->nullable()->after('staff_quota_deadline_at');
        });
    }

    public function down(): void
    {
        Schema::table('schools', function (Blueprint $table) {
            $table->dropColumn(['staff_quota_deadline_at', 'staff_quota_reminder_sent_at']);
        });
    }
};
