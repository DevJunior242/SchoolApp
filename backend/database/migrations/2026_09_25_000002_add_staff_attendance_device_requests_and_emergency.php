<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('school_staff_attendance_device_requests', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('school_id')->constrained()->cascadeOnDelete();
            $table->foreignUuid('user_id')->constrained()->cascadeOnDelete();
            $table->string('device_hash', 64);
            $table->string('user_agent')->nullable();
            $table->string('status', 20)->default('pending');
            $table->foreignUuid('reviewed_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('reviewed_at')->nullable();
            $table->timestamps();

            $table->index(['school_id', 'status'], 'staff_device_requests_school_status_index');
        });

        Schema::table('school_staff_attendance_settings', function (Blueprint $table) {
            $table->timestamp('emergency_until')->nullable()->after('radius_meters');
            $table->foreignUuid('emergency_enabled_by')->nullable()->after('emergency_until')->constrained('users')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('school_staff_attendance_settings', function (Blueprint $table) {
            $table->dropConstrainedForeignId('emergency_enabled_by');
            $table->dropColumn('emergency_until');
        });

        Schema::dropIfExists('school_staff_attendance_device_requests');
    }
};
