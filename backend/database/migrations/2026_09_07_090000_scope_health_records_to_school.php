<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        foreach (['student_medications', 'student_health_documents'] as $tableName) {
            Schema::table($tableName, function (Blueprint $table): void {
                $table->foreignUuid('school_id')->nullable()->after('id')->constrained()->nullOnDelete();
                $table->index(['school_id', 'student_id']);
            });

            DB::statement("UPDATE {$tableName} r JOIN (SELECT student_id, MIN(school_id) AS school_id FROM school_students WHERE status = 1 GROUP BY student_id) enrollment ON enrollment.student_id = r.student_id SET r.school_id = enrollment.school_id WHERE r.school_id IS NULL");
        }
    }

    public function down(): void
    {
        foreach (['student_medications', 'student_health_documents'] as $tableName) {
            Schema::table($tableName, function (Blueprint $table): void {
                $table->dropForeign(['school_id']);
                $table->dropIndex(['school_id', 'student_id']);
                $table->dropColumn('school_id');
            });
        }
    }
};
