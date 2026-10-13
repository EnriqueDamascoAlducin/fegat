<?php

use App\Http\Controllers\Admin\CompanyController;
use App\Http\Controllers\Admin\HomeContentController;
use App\Http\Controllers\Admin\HomeSectionController;
use App\Http\Controllers\Admin\PostController;
use App\Http\Controllers\Admin\UserController;
use App\Http\Controllers\Admin\VoteHistoryController;
use App\Http\Controllers\Admin\VotingSettingController;
use App\Http\Controllers\BlogController;
use App\Http\Controllers\ContactController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\HomeController;
use App\Http\Controllers\VoteController;
use App\Http\Middleware\EnsureSuperAdmin;
use Illuminate\Support\Facades\Route;

Route::get('/', HomeController::class)->name('home');
Route::post('contacto', [ContactController::class, 'store'])->middleware('throttle:5,1')->name('contact.store');
Route::get('blog', [BlogController::class, 'index'])->name('blog.index');
Route::get('blog/{post:slug}', [BlogController::class, 'show'])->name('blog.show');

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

        Route::get('inicio', [HomeContentController::class, 'edit'])->name('home.edit');
        Route::put('inicio', [HomeContentController::class, 'update'])->name('home.update');
        Route::post('inicio/secciones', [HomeSectionController::class, 'store'])->name('sections.store');
        Route::post('inicio/secciones/imagen', [HomeSectionController::class, 'image'])->name('sections.image');
        Route::put('inicio/secciones/{section}', [HomeSectionController::class, 'update'])->name('sections.update');
        Route::delete('inicio/secciones/{section}', [HomeSectionController::class, 'destroy'])->name('sections.destroy');
        Route::post('inicio/secciones/{section}/mover', [HomeSectionController::class, 'move'])->name('sections.move');

        Route::get('blog', [PostController::class, 'index'])->name('posts.index');
        Route::get('blog/crear', [PostController::class, 'create'])->name('posts.create');
        Route::post('blog', [PostController::class, 'store'])->name('posts.store');
        Route::post('blog/imagen', [PostController::class, 'image'])->name('posts.image');
        Route::get('blog/{post}/editar', [PostController::class, 'edit'])->name('posts.edit');
        Route::put('blog/{post}', [PostController::class, 'update'])->name('posts.update');
        Route::delete('blog/{post}', [PostController::class, 'destroy'])->name('posts.destroy');
    });
});

require __DIR__.'/settings.php';
