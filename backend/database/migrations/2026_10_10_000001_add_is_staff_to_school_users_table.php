<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * is_staff : la personne travaille comme salariée de l'école (menus
 * « Mon pointage » / « Ma paie », droit de pointer). Vrai pour tout le
 * monde, sauf le créateur de l'école (fondateur / promoteur), qui peut
 * l'activer lui-même s'il est aussi salarié.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('school_users', function (Blueprint $table) {
            $table->boolean('is_staff')->default(true)->after('is_owner');
        });

        $adminRoleId = DB::table('roles')->where('slug', 'admin')->value('id');

        if ($adminRoleId) {
            DB::table('school_users')
                ->where('role_id', $adminRoleId)
                ->where('is_owner', true)
                ->update(['is_staff' => false]);
        }
    }

    public function down(): void
    {
        Schema::table('school_users', function (Blueprint $table) {
            $table->dropColumn('is_staff');
        });
    }
};
