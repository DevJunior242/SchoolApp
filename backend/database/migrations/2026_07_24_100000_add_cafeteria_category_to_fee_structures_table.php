<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Un abonnement cantine est structurellement un FeeStructure (montant
     * fixé par l'école, payé, confirmé par le comptable) mais rattaché à
     * une saison plutôt qu'à un niveau : `level_id`/`order` (pensés pour
     * les tranches de scolarité) deviennent optionnels pour ce cas.
     */
    public function up(): void
    {
        Schema::table('fee_structures', function (Blueprint $table) {
            $table->tinyInteger('category')->default(1)->after('school_year_id');
            $table->foreignUuid('season_id')->nullable()->after('level_id')->constrained()->cascadeOnDelete();
        });

        // ->change() nécessite doctrine/dbal (non installé) : SQL direct.
        DB::statement('ALTER TABLE fee_structures MODIFY level_id CHAR(36) NULL');
        DB::statement('ALTER TABLE fee_structures MODIFY `order` SMALLINT UNSIGNED NULL');
    }

    public function down(): void
    {
        Schema::table('fee_structures', function (Blueprint $table) {
            $table->dropConstrainedForeignId('season_id');
            $table->dropColumn('category');
        });

        DB::statement('ALTER TABLE fee_structures MODIFY level_id CHAR(36) NOT NULL');
        DB::statement('ALTER TABLE fee_structures MODIFY `order` SMALLINT UNSIGNED NOT NULL');
    }
};
