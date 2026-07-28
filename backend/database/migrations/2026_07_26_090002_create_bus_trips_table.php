<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('bus_trips', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('bus_id')->constrained()->cascadeOnDelete();
            $table->foreignUuid('driver_id')->constrained('users')->cascadeOnDelete();
            $table->tinyInteger('direction');
            $table->tinyInteger('status')->default(1);
            $table->decimal('current_latitude', 10, 7)->nullable();
            $table->decimal('current_longitude', 10, 7)->nullable();
            $table->timestamp('last_ping_at')->nullable();
            $table->timestamp('started_at')->nullable();
            $table->timestamp('ended_at')->nullable();
            $table->timestamps();

            $table->index(['bus_id', 'status']);
        });

        Schema::create('bus_trip_stop_events', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('bus_trip_id')->constrained()->cascadeOnDelete();
            $table->foreignUuid('bus_stop_id')->constrained()->cascadeOnDelete();
            $table->timestamp('notified_at')->nullable();
            $table->timestamp('reached_at')->nullable();
            $table->timestamps();

            $table->unique(['bus_trip_id', 'bus_stop_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('bus_trip_stop_events');
        Schema::dropIfExists('bus_trips');
    }
};
