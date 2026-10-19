<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Cross-Origin Resource Sharing (CORS)
    |--------------------------------------------------------------------------
    |
    | El CORS de la API lo decide cada llave (App\Http\Middleware\AuthenticateApiClient
    | con sus «dominios permitidos»). Por eso el CORS global de Laravel queda apagado:
    | con su valor por defecto respondería «*» a cualquier dominio en api/*.
    |
    */

    'paths' => [],

    'allowed_methods' => ['*'],

    'allowed_origins' => [],

    'allowed_origins_patterns' => [],

    'allowed_headers' => ['*'],

    'exposed_headers' => [],

    'max_age' => 0,

    'supports_credentials' => false,

];
