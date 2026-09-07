<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::statement('ALTER TABLE school_staff_leaves MODIFY leave_type VARCHAR(100) NOT NULL');

        DB::table('school_staff_leaves')->where('leave_type', 1)->update(['leave_type' => 'Congé annuel']);
        DB::table('school_staff_leaves')->where('leave_type', 2)->update(['leave_type' => 'Maladie']);
        DB::table('school_staff_leaves')->where('leave_type', 3)->update(['leave_type' => 'Congé exceptionnel']);
        DB::table('school_staff_leaves')->where('leave_type', 4)->update(['leave_type' => 'Congé maternité']);
    }

    public function down(): void
    {
        DB::statement('ALTER TABLE school_staff_leaves MODIFY leave_type TINYINT NOT NULL DEFAULT 1');
    }
};
