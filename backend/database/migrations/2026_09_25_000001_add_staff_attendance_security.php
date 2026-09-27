<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('school_staff_attendance_settings', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('school_id')->unique()->constrained()->cascadeOnDelete();
            $table->string('qr_mode', 20)->default('rotating');
            $table->boolean('require_network')->default(false);
            $table->boolean('require_device')->default(false);
            $table->boolean('require_gps')->default(false);
            $table->json('allowed_networks')->nullable();
            $table->decimal('latitude', 10, 7)->nullable();
            $table->decimal('longitude', 10, 7)->nullable();
            $table->unsignedSmallInteger('radius_meters')->default(150);
            $table->text('printed_token')->nullable();
            $table->string('printed_token_hash', 64)->nullable()->unique();
            $table->timestamp('printed_token_generated_at')->nullable();
            $table->timestamps();
        });

        Schema::create('school_staff_attendance_devices', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('school_id')->constrained()->cascadeOnDelete();
            $table->foreignUuid('user_id')->constrained()->cascadeOnDelete();
            $table->string('device_hash', 64);
            $table->string('user_agent')->nullable();
            $table->timestamp('bound_at');
            $table->timestamps();

            $table->unique(['school_id', 'user_id'], 'staff_attendance_device_user_unique');
            $table->unique(['school_id', 'device_hash'], 'staff_attendance_device_hash_unique');
        });

        Schema::create('school_staff_attendance_punches', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('school_id')->constrained()->cascadeOnDelete();
            $table->foreignUuid('user_id')->constrained()->cascadeOnDelete();
            $table->foreignUuid('school_staff_attendance_id')->nullable();
            $table->string('result', 20);
            $table->string('rejection_reason')->nullable();
            $table->json('flags')->nullable();
            $table->string('qr_mode', 20);
            $table->string('ip_address', 45)->nullable();
            $table->string('device_hash', 64)->nullable();
            $table->string('user_agent')->nullable();
            $table->decimal('latitude', 10, 7)->nullable();
            $table->decimal('longitude', 10, 7)->nullable();
            $table->unsignedInteger('accuracy_meters')->nullable();
            $table->unsignedInteger('distance_meters')->nullable();
            $table->timestamps();

            $table->index(['school_id', 'created_at']);
            // Nom explicite : celui généré par Laravel dépasse 64 caractères (limite MySQL).
            $table->foreign('school_staff_attendance_id', 'staff_attendance_punches_attendance_fk')
                ->references('id')->on('school_staff_attendances')->nullOnDelete();
        });

        Schema::table('school_staff_attendances', function (Blueprint $table) {
            $table->json('flags')->nullable()->after('check_out_source');
        });
    }

    public function down(): void
    {
        Schema::table('school_staff_attendances', function (Blueprint $table) {
            $table->dropColumn('flags');
        });

        Schema::dropIfExists('school_staff_attendance_punches');
        Schema::dropIfExists('school_staff_attendance_devices');
        Schema::dropIfExists('school_staff_attendance_settings');
    }
};
