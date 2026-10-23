<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * El recordatorio de WhatsApp deja de salir justo al abrir la votación: se
     * manda a una primera hora y, opcionalmente, se repite a una segunda.
     */
    public function up(): void
    {
        Schema::table('voting_settings', function (Blueprint $table) {
            $table->string('reminder_first_at', 5)->default('05:00')->after('whatsapp_enabled');
            $table->string('reminder_second_at', 5)->nullable()->after('reminder_first_at');
        });

        // Hasta ahora el recordatorio salía a la hora de apertura; se conserva.
        DB::table('voting_settings')->update(['reminder_first_at' => DB::raw('opens_at')]);
    }

    public function down(): void
    {
        Schema::table('voting_settings', function (Blueprint $table) {
            $table->dropColumn(['reminder_first_at', 'reminder_second_at']);
        });
    }
};
