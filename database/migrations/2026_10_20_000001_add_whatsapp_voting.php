<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Votación por WhatsApp: teléfono de cada usuario, interruptor general,
     * registro de recordatorios enviados y canal por el que llegó cada voto.
     */
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('phone', 20)->nullable()->unique()->after('username');
        });

        Schema::table('voting_settings', function (Blueprint $table) {
            $table->boolean('whatsapp_enabled')->default(false)->after('public_visible');
        });

        Schema::table('vote_changes', function (Blueprint $table) {
            $table->string('channel', 20)->default('web')->after('to_color');
        });

        Schema::create('whatsapp_reminders', function (Blueprint $table) {
            $table->id();
            $table->date('flight_date');
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('status', 20);
            $table->string('error')->nullable();
            $table->timestamps();

            $table->unique(['flight_date', 'user_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('whatsapp_reminders');

        Schema::table('vote_changes', function (Blueprint $table) {
            $table->dropColumn('channel');
        });

        Schema::table('voting_settings', function (Blueprint $table) {
            $table->dropColumn('whatsapp_enabled');
        });

        Schema::table('users', function (Blueprint $table) {
            $table->dropUnique(['phone']);
            $table->dropColumn('phone');
        });
    }
};
