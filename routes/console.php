<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

// Visitantes del sitio: foto de activos, archivo de visitas y limpieza. Necesita el
// cron del scheduler (`php artisan schedule:run` cada minuto) en el servidor.
Schedule::command('site:visitors-snapshot')
    ->everyFiveMinutes()
    ->withoutOverlapping();

// Votación por WhatsApp: recordatorio y encuesta en cuanto abre la votación.
Schedule::command('fegat:whatsapp-recordatorios')
    ->everyMinute()
    ->withoutOverlapping();

// Resumen diario de votos para los super admin, a partir de la hora configurada.
Schedule::command('fegat:whatsapp-resumen')
    ->everyMinute()
    ->withoutOverlapping();
