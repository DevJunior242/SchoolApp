<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('enrollment_requests', function (Blueprint $table) {
            $table->foreignUuid('level_id')->nullable()->after('child_birthdate')
                ->constrained('levels')->nullOnDelete();
            $table->foreignUuid('student_id')->nullable()->after('level_id')
                ->constrained('students')->nullOnDelete();
            $table->text('rejection_reason')->nullable()->after('status');
        });
    }

    public function down(): void
    {
        Schema::table('enrollment_requests', function (Blueprint $table) {
            $table->dropForeign(['level_id']);
            $table->dropForeign(['student_id']);
            $table->dropColumn(['level_id', 'student_id', 'rejection_reason']);
        });
    }
};
