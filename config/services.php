<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Third Party Services
    |--------------------------------------------------------------------------
    |
    | This file is for storing the credentials for third party services such
    | as Resend, Postmark, AWS, and more. This file provides the de facto
    | location for this type of information, allowing packages to have
    | a conventional file to locate the various service credentials.
    |
    */

    'postmark' => [
        'key' => env('POSTMARK_API_KEY'),
    ],

    'resend' => [
        'key' => env('RESEND_API_KEY'),
    ],

    'ses' => [
        'key' => env('AWS_ACCESS_KEY_ID'),
        'secret' => env('AWS_SECRET_ACCESS_KEY'),
        'region' => env('AWS_DEFAULT_REGION', 'us-east-1'),
    ],

    // Votación por WhatsApp (misma cuenta y forma de configurar que en SAV).
    'twilio' => [
        'sid' => env('TWILIO_ACCOUNT_SID'),
        'token' => env('TWILIO_AUTH_TOKEN'),
        'whatsapp_from' => env('TWILIO_WHATSAPP_FROM'),
        'ssl_verify' => env('TWILIO_SSL_VERIFY', true),
        // Plantillas aprobadas (Content SID «HX…»).
        'template_vote_reminder' => env('TWILIO_TEMPLATE_VOTE_REMINDER'),
        'template_vote_poll' => env('TWILIO_TEMPLATE_VOTE_POLL'),
        'template_daily_summary' => env('TWILIO_TEMPLATE_DAILY_SUMMARY'),
        // URL pública exacta configurada en Twilio, si el servidor está detrás de un proxy.
        'webhook_url' => env('TWILIO_WEBHOOK_URL'),
    ],

    'slack' => [
        'notifications' => [
            'bot_user_oauth_token' => env('SLACK_BOT_USER_OAUTH_TOKEN'),
            'channel' => env('SLACK_BOT_USER_DEFAULT_CHANNEL'),
        ],
    ],

];
