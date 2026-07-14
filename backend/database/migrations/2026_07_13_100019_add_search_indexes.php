<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->index('fullname');
        });

        Schema::table('students', function (Blueprint $table) {
            $table->index('fullname');
        });

        Schema::table('classes', function (Blueprint $table) {
            $table->index('name');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropIndex(['fullname']);
        });

        Schema::table('students', function (Blueprint $table) {
            $table->dropIndex(['fullname']);
        });

        Schema::table('classes', function (Blueprint $table) {
            $table->dropIndex(['name']);
        });
    }
};
