<?php

use Illuminate\Support\Facades\Schema;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Database\Migrations\Migration;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('school_staff_profiles', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('school_id')->constrained()->cascadeOnDelete();
            $table->foreignUuid('user_id')->constrained()->cascadeOnDelete();
            $table->string('department')->nullable();
            $table->string('position')->nullable();
            $table->tinyInteger('employment_status')->nullable();
            $table->date('hire_date')->nullable();
            $table->decimal('monthly_salary', 12, 2)->nullable();
            $table->tinyInteger('contract_type')->nullable();
            $table->timestamps();

            $table->unique(['school_id', 'user_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('school_staff_profiles');
    }
};
