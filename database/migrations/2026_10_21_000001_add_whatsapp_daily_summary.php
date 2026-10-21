<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Resumen diario por WhatsApp para los super admin. Los envíos se registran
     * en la misma tabla que los recordatorios, distinguidos por «kind».
     */
    public function up(): void
    {
        Schema::table('voting_settings', function (Blueprint $table) {
            $table->boolean('summary_enabled')->default(false)->after('whatsapp_enabled');
            $table->string('summary_at', 5)->default('12:00')->after('summary_enabled');
        });

        Schema::table('whatsapp_reminders', function (Blueprint $table) {
            $table->string('kind', 20)->default('reminder')->after('user_id');
            $table->unique(['flight_date', 'user_id', 'kind']);
        });

        Schema::table('whatsapp_reminders', function (Blueprint $table) {
            $table->dropUnique(['flight_date', 'user_id']);
        });
    }

    public function down(): void
    {
        Schema::table('whatsapp_reminders', function (Blueprint $table) {
            $table->unique(['flight_date', 'user_id']);
        });

        Schema::table('whatsapp_reminders', function (Blueprint $table) {
            $table->dropUnique(['flight_date', 'user_id', 'kind']);
            $table->dropColumn('kind');
        });

        Schema::table('voting_settings', function (Blueprint $table) {
            $table->dropColumn(['summary_enabled', 'summary_at']);
        });
    }
};
