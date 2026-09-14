<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('exam_subjects', function (Blueprint $table) {
            if (! Schema::hasColumn('exam_subjects', 'school_class_id')) {
                $table->foreignUuid('school_class_id')->nullable()->constrained('classes')->nullOnDelete();
            }
        });

        if ($this->indexExists('exam_subjects_exam_id_subject_id_unique')) {
            DB::statement('ALTER TABLE exam_subjects DROP INDEX exam_subjects_exam_id_subject_id_unique');
        }

        if (! $this->indexExists('exam_subjects_exam_id_school_class_id_subject_id_unique')) {
            DB::statement('ALTER TABLE exam_subjects ADD UNIQUE INDEX exam_subjects_exam_id_school_class_id_subject_id_unique (exam_id, school_class_id, subject_id)');
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if ($this->indexExists('exam_subjects_exam_id_school_class_id_subject_id_unique')) {
            DB::statement('ALTER TABLE exam_subjects DROP INDEX exam_subjects_exam_id_school_class_id_subject_id_unique');
        }

        Schema::table('exam_subjects', function (Blueprint $table) {
            if (Schema::hasColumn('exam_subjects', 'school_class_id')) {
                $table->dropForeign(['school_class_id']);
                $table->dropColumn('school_class_id');
            }
        });

        if (! $this->indexExists('exam_subjects_exam_id_subject_id_unique')) {
            DB::statement('ALTER TABLE exam_subjects ADD UNIQUE INDEX exam_subjects_exam_id_subject_id_unique (exam_id, subject_id)');
        }
    }

    private function indexExists(string $indexName): bool
    {
        $indexes = DB::select('SHOW INDEX FROM exam_subjects');

        return collect($indexes)->contains('Key_name', $indexName);
    }
};
