<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Visitantes del sitio público (port de sav_3)
    |--------------------------------------------------------------------------
    |
    | El navegador del visitante manda un latido a /presencia y el panel
    | «Visitantes en vivo» cuenta a quien haya latido hace poco. Apagarlo aquí
    | detiene los latidos (el navegador deja de mandarlos en la siguiente carga)
    | y el snapshot del histórico.
    |
    */

    'enabled' => (bool) env('LIVE_VISITORS_ENABLED', true),

    // Segundos entre latidos. En hosting compartido cada latido arranca PHP:
    // si hay un pico de tráfico, subirlo a 45–60 baja la carga a la mitad.
    'heartbeat_seconds' => max(15, (int) env('LIVE_VISITORS_HEARTBEAT', 30)),

    // Un visitante cuenta como activo si latió dentro de esta ventana. Debe
    // cubrir al menos dos latidos para tolerar uno perdido.
    'active_seconds' => max(45, (int) env('LIVE_VISITORS_ACTIVE_WINDOW', 90)),

    // Horas que se conserva la fila de un visitante inactivo ("visitantes hoy").
    'retention_hours' => (int) env('LIVE_VISITORS_RETENTION_HOURS', 48),

    // Días que se conserva el histórico de snapshots (uno cada 5 minutos).
    'snapshot_retention_days' => (int) env('LIVE_VISITORS_SNAPSHOT_DAYS', 90),

    // Días que se conservan las visitas y páginas vistas (Reporte de visitantes).
    'visits_retention_days' => (int) env('LIVE_VISITORS_VISITS_DAYS', 400),

    // País del visitante: el encabezado CF-IPCountry si el sitio está detrás de
    // Cloudflare; si no, una consulta a ipwho.is por IP (en caché 30 días).
    // false = solo Cloudflare, sin llamadas externas.
    'geo_lookup' => (bool) env('LIVE_VISITORS_GEO_LOOKUP', true),

];
