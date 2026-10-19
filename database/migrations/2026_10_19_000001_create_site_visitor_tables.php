<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Visitantes del sitio público (port de las tablas store_* de sav_3, sin checkout ni chat).
 */
return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // Una fila por navegador: el latido la crea o le mueve last_seen_at.
        Schema::create('site_live_visitors', function (Blueprint $table) {
            $table->id();
            $table->uuid('visitor_token')->unique();
            $table->char('ip_hash', 64)->nullable();
            $table->char('country_code', 2)->nullable();
            $table->string('device_type', 20)->nullable();
            $table->string('os', 30)->nullable();
            $table->string('browser', 30)->nullable();
            $table->string('in_app', 30)->nullable();
            $table->unsignedSmallInteger('screen_width')->nullable();
            $table->string('path', 500);
            $table->string('page_title', 255)->nullable();
            $table->string('landing_path', 500)->nullable();
            $table->string('referrer_host', 255)->nullable();
            $table->string('utm_source')->nullable();
            $table->string('utm_medium')->nullable();
            $table->string('utm_campaign')->nullable();
            $table->string('paid_click', 20)->nullable();
            $table->unsignedInteger('page_views')->default(1);
            $table->timestamp('first_seen_at')->nullable()->index();
            $table->timestamp('last_seen_at')->nullable()->index();
        });

        // Foto de cuántos había cada 5 minutos, para graficar picos.
        Schema::create('site_visitor_snapshots', function (Blueprint $table) {
            $table->id();
            $table->timestamp('captured_at')->index();
            $table->unsignedInteger('active_count')->default(0);
            $table->unsignedInteger('mobile_count')->default(0);
            $table->unsignedInteger('tablet_count')->default(0);
            $table->unsignedInteger('desktop_count')->default(0);
        });

        // Una fila por visita: site_live_visitors se pisa cuando el navegador
        // vuelve y se limpia a las 48 h, así que el reporte vive de esta tabla.
        Schema::create('site_visits', function (Blueprint $table) {
            $table->id();
            $table->uuid('visitor_token');
            $table->timestamp('started_at')->nullable()->index();
            $table->timestamp('ended_at')->nullable();
            $table->unsignedInteger('duration_seconds')->default(0);
            $table->char('country_code', 2)->nullable();
            $table->string('device_type', 20)->nullable();
            $table->string('os', 30)->nullable();
            $table->string('browser', 30)->nullable();
            $table->string('in_app', 30)->nullable();
            $table->unsignedSmallInteger('screen_width')->nullable();
            $table->string('landing_path', 500)->nullable();
            $table->string('exit_path', 500)->nullable();
            $table->string('referrer_host', 255)->nullable();
            $table->string('utm_source')->nullable();
            $table->string('utm_medium')->nullable();
            $table->string('utm_campaign')->nullable();
            $table->string('paid_click', 20)->nullable();
            $table->unsignedInteger('page_views')->default(1);

            $table->unique(['visitor_token', 'started_at']);
        });

        // Una fila por página vista: site_visits solo guarda el conteo, esto dice
        // cuáles fueron. Se liga a la visita por navegador y hora.
        Schema::create('site_page_views', function (Blueprint $table) {
            $table->id();
            $table->uuid('visitor_token');
            $table->string('path', 500);
            $table->string('title', 255)->nullable();
            $table->timestamp('viewed_at')->nullable()->index();

            $table->index(['visitor_token', 'viewed_at']);
            $table->index(['path', 'viewed_at']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('site_page_views');
        Schema::dropIfExists('site_visits');
        Schema::dropIfExists('site_visitor_snapshots');
        Schema::dropIfExists('site_live_visitors');
    }
};
