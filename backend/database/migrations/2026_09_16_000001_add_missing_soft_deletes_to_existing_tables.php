<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    private array $tables = [
        'sections',
        'schools',
        'school_users',
        'school_years',
        'seasons',
        'classes',
        'school_sections',
        'exam_types',
        'exams',
        'exam_subjects',
        'exam_candidates',
        'exam_candidate_subjects',
        'exam_results',
        'exam_result_details',
        'exam_targets',
        'payments',
        'messages',
        'treasury_accounts',
        'expenses',
        'treasury_movements',
    ];

    public function up(): void
    {
        foreach ($this->tables as $tableName) {
            if (Schema::hasTable($tableName) && ! Schema::hasColumn($tableName, 'deleted_at')) {
                Schema::table($tableName, function (Blueprint $table): void {
                    $table->softDeletes();
                });
            }
        }
    }

    public function down(): void
    {
        // This migration repairs schema drift and must not remove columns
        // that may have existed before it ran.
    }
};
