<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('fee_structures', function (Blueprint $table) {
            // Nullable : seules les tranches de catégorie "personnalisée"
            // (CATEGORY_CUSTOM) en ont une ; scolarité et cantine restent
            // identifiées par la constante `category` seule.
            $table->foreignUuid('fee_category_id')->nullable()->after('category')
                ->constrained()->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('fee_structures', function (Blueprint $table) {
            $table->dropConstrainedForeignId('fee_category_id');
        });
    }
};
