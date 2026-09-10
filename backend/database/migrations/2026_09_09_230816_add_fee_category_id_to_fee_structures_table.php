<?php

use Illuminate\Support\Facades\Schema;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Database\Migrations\Migration;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
  public function up(): void
{
    Schema::table('fee_structures', function (Blueprint $table) {
        $table->foreignUuid('fee_category_id')
              ->nullable()
              ->after('id')
              ->constrained('fee_categories')
              ->nullOnDelete();
    });
}

/**
 * Reverse the migrations.
 */
public function down(): void
{
    Schema::table('fee_structures', function (Blueprint $table) {
        $table->dropForeign(['fee_category_id']);
        $table->dropColumn('fee_category_id');
    });
}
};
