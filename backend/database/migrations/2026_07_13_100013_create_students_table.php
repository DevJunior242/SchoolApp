<?php

use Illuminate\Support\Facades\Schema;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Database\Migrations\Migration;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('students', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('user_id')->nullable()->constrained()->nullOnDelete();
            $table->string('fullname');
            $table->date('date_of_birth');
            $table->string('gender');
            $table->string('birth_place')->nullable();
            $table->string('blood_type')->nullable();
            $table->text('medical_notes')->nullable();
            $table->string('photo')->nullable();
            $table->string('matricule')->nullable()->unique();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('students');
    }
};
