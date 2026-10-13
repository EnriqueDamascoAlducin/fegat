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

];
