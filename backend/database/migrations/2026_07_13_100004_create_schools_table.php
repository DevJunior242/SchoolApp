<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('schools', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('country_id')->constrained()->cascadeOnDelete();
            $table->string('name');
            $table->string('logo')->nullable();
            $table->string('slogan')->nullable();
            $table->string('address')->nullable();
            $table->string('city')->nullable();
            $table->string('phone')->nullable();
            $table->string('email')->nullable();
            $table->string('website')->nullable();
            $table->tinyInteger('status')->default(1);
            $table->string('plan', 20)->default('etablissement');
            $table->timestamp('trial_ends_at')->nullable();
            $table->timestamp('trial_reminder_sent_at')->nullable();
            $table->timestamp('staff_quota_deadline_at')->nullable();
            $table->timestamp('staff_quota_reminder_sent_at')->nullable();
            // Nullable for compatibility with schools created before a plan is assigned.
            $table->uuid('pricing_plan_id')->nullable();
            $table->string('language', 5)->default('fr');
            $table->string('currency', 10)->nullable();
            $table->string('academic_period_type', 10)->default('trimestre');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('schools');
    }
};
