<?php

use App\Http\Controllers\Api\SemaphoreController;
use App\Http\Middleware\AuthenticateApiClient;
use Illuminate\Support\Facades\Route;

// API para sistemas externos (por ejemplo sav_3). Sin sesión: cada petición trae su llave
// en «Authorization: Bearer fegat_…». Las llaves se crean en Panel → Llaves de API.
Route::middleware([AuthenticateApiClient::class, 'throttle:api-clients'])->group(function () {
    Route::match(['GET', 'OPTIONS'], 'semaforo', SemaphoreController::class)->name('api.semaphore');
});
