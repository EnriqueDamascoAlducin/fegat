<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * El teléfono deja de ser único en toda la tabla: solo no puede repetirse
     * dentro del mismo rol.
     */
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropUnique(['phone']);
            $table->unique(['phone', 'role']);
        });
    }

    /**
     * Falla si ya hay números compartidos entre roles.
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropUnique(['phone', 'role']);
            $table->unique('phone');
        });
    }
};
