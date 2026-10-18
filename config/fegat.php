<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Super administrador inicial
    |--------------------------------------------------------------------------
    |
    | Credenciales con las que el seeder crea (o actualiza) al super
    | administrador de la federación. Si están vacías no se crea nada.
    |
    */

    'admin' => [
        'email' => env('ADMIN_EMAIL'),
        'password' => env('ADMIN_PASSWORD'),
    ],

    /*
    |--------------------------------------------------------------------------
    | Formulario de contacto
    |--------------------------------------------------------------------------
    |
    | Correo que recibe los mensajes del formulario de la página pública.
    | Si está vacío se usa la dirección remitente de la aplicación.
    |
    */

    'contact_email' => env('CONTACT_EMAIL'),

    /*
    |--------------------------------------------------------------------------
    | Clima
    |--------------------------------------------------------------------------
    |
    | Pronóstico de Open-Meteo (gratuito y sin clave) para la zona de vuelo.
    | `morning_hours` es el rango de horas que se muestra para la jornada.
    |
    */

    'weather' => [
        'latitude' => (float) env('WEATHER_LATITUDE', 19.6925),
        'longitude' => (float) env('WEATHER_LONGITUDE', -98.8438),
        'cache_minutes' => (int) env('WEATHER_CACHE_MINUTES', 15),
        'morning_hours' => [5, 10],
    ],

];
