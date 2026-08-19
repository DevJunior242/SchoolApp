<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('schools', function (Blueprint $table) {
            // Défaut 'etablissement' (accès complet) pour ne pas couper l'accès
            // des écoles déjà actives : le palier ne s'applique de fait qu'aux
            // écoles créées après l'introduction des paliers.
            $table->string('plan', 20)->default('etablissement')->after('status');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('schools', function (Blueprint $table) {
            $table->dropColumn('plan');
        });
    }
};
