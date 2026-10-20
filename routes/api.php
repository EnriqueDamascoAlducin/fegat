<?php

use App\Http\Controllers\Api\SemaphoreController;
use App\Http\Controllers\Webhooks\TwilioWhatsAppController;
use App\Http\Middleware\AuthenticateApiClient;
use App\Http\Middleware\VerifyTwilioSignature;
use Illuminate\Support\Facades\Route;

// Respuestas de WhatsApp (encuesta de votación). Twilio firma cada petición.
Route::post('webhooks/twilio/whatsapp', TwilioWhatsAppController::class)
    ->middleware([VerifyTwilioSignature::class, 'throttle:120,1'])
    ->name('webhooks.twilio.whatsapp');

// API para sistemas externos (por ejemplo sav_3). Sin sesión: cada petición trae su llave
// en «Authorization: Bearer fegat_…». Las llaves se crean en Panel → Llaves de API.
Route::middleware([AuthenticateApiClient::class, 'throttle:api-clients'])->group(function () {
    Route::match(['GET', 'OPTIONS'], 'semaforo', SemaphoreController::class)->name('api.semaphore');
});
