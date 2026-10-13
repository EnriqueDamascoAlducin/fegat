<?php

use App\Http\Controllers\Admin\CompanyController;
use App\Http\Controllers\Admin\UserController;
use App\Http\Controllers\Admin\VoteHistoryController;
use App\Http\Controllers\Admin\VotingSettingController;
use App\Http\Controllers\ContactController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\HomeController;
use App\Http\Controllers\VoteController;
use App\Http\Middleware\EnsureSuperAdmin;
use Illuminate\Support\Facades\Route;

Route::get('/', HomeController::class)->name('home');
Route::post('contacto', [ContactController::class, 'store'])->middleware('throttle:5,1')->name('contact.store');

Route::middleware(['auth', 'verified'])->group(function () {
    Route::get('dashboard', DashboardController::class)->name('dashboard');
    Route::post('votes', [VoteController::class, 'store'])->name('votes.store');

    Route::middleware(EnsureSuperAdmin::class)->prefix('admin')->name('admin.')->group(function () {
        Route::get('votacion', [VotingSettingController::class, 'edit'])->name('voting.edit');
        Route::put('votacion', [VotingSettingController::class, 'update'])->name('voting.update');

        Route::get('empresas', [CompanyController::class, 'index'])->name('companies.index');
        Route::post('empresas', [CompanyController::class, 'store'])->name('companies.store');
        Route::put('empresas/{company}', [CompanyController::class, 'update'])->name('companies.update');

        Route::get('usuarios', [UserController::class, 'index'])->name('users.index');
        Route::post('usuarios', [UserController::class, 'store'])->name('users.store');
        Route::put('usuarios/{user}', [UserController::class, 'update'])->name('users.update');
        Route::delete('usuarios/{user}', [UserController::class, 'destroy'])->name('users.destroy');

        Route::get('historial', VoteHistoryController::class)->name('history');
    });
});

require __DIR__.'/settings.php';
