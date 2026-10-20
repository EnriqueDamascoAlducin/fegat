<?php

use App\Http\Controllers\Admin\ApiClientController;
use App\Http\Controllers\Admin\BlogSettingsController;
use App\Http\Controllers\Admin\BlogTaxonomyController;
use App\Http\Controllers\Admin\CompanyController;
use App\Http\Controllers\Admin\LiveVisitorsController;
use App\Http\Controllers\Admin\PageController as AdminPageController;
use App\Http\Controllers\Admin\PostController;
use App\Http\Controllers\Admin\SiteLayoutController;
use App\Http\Controllers\Admin\UserController;
use App\Http\Controllers\Admin\VisitorReportController;
use App\Http\Controllers\Admin\VoteHistoryController;
use App\Http\Controllers\Admin\VotingSettingController;
use App\Http\Controllers\Admin\WhatsAppTestController;
use App\Http\Controllers\BlogController;
use App\Http\Controllers\ContactController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\DecisionController;
use App\Http\Controllers\HomeController;
use App\Http\Controllers\IndicatorController;
use App\Http\Controllers\PageController;
use App\Http\Controllers\SitePresenceController;
use App\Http\Controllers\VoteController;
use App\Http\Middleware\EnsureSuperAdmin;
use App\Http\Middleware\HandleAppearance;
use App\Http\Middleware\HandleInertiaRequests;
use Illuminate\Cookie\Middleware\AddQueuedCookiesToResponse;
use Illuminate\Cookie\Middleware\EncryptCookies;
use Illuminate\Foundation\Http\Middleware\PreventRequestForgery;
use Illuminate\Http\Middleware\AddLinkHeadersForPreloadedAssets;
use Illuminate\Session\Middleware\StartSession;
use Illuminate\Support\Facades\Route;
use Illuminate\View\Middleware\ShareErrorsFromSession;

Route::get('/', HomeController::class)->name('home');
Route::post('contacto', [ContactController::class, 'store'])->middleware('throttle:5,1')->name('contact.store');
Route::get('blog', [BlogController::class, 'index'])->name('blog.index');
Route::get('blog/feed.xml', [BlogController::class, 'feed'])->name('blog.feed');
Route::get('blog/categoria/{slug}', [BlogController::class, 'category'])->name('blog.category');
Route::get('blog/etiqueta/{slug}', [BlogController::class, 'tag'])->name('blog.tag');
Route::get('blog/{post:slug}', [BlogController::class, 'show'])->name('blog.show');

// Latido de «visitantes en vivo». Se llama cada ~30 s por visitante, así que va sin
// sesión (driver database = lectura + escritura por petición), sin cookies y sin
// Inertia. Sin sesión no hay token CSRF: solo escribe la fila del propio navegador.
Route::post('presencia', SitePresenceController::class)
    ->middleware('throttle:120,1')
    ->withoutMiddleware([
        EncryptCookies::class,
        AddQueuedCookiesToResponse::class,
        StartSession::class,
        ShareErrorsFromSession::class,
        PreventRequestForgery::class,
        HandleAppearance::class,
        HandleInertiaRequests::class,
        AddLinkHeadersForPreloadedAssets::class,
    ])
    ->name('presence');

Route::middleware('auth')->group(function () {
    Route::get('dashboard', DashboardController::class)->name('dashboard');
    Route::get('indicadores', IndicatorController::class)->name('indicators');
    Route::post('votes', [VoteController::class, 'store'])->name('votes.store');
    Route::post('decision', [DecisionController::class, 'store'])->name('decision.store');
    Route::delete('decision', [DecisionController::class, 'destroy'])->name('decision.destroy');

    Route::middleware(EnsureSuperAdmin::class)->prefix('admin')->name('admin.')->group(function () {
        Route::get('votacion', [VotingSettingController::class, 'edit'])->name('voting.edit');
        Route::put('votacion', [VotingSettingController::class, 'update'])->name('voting.update');
        Route::post('votacion/whatsapp-prueba', WhatsAppTestController::class)
            ->middleware('throttle:10,1')
            ->name('voting.whatsapp-test');

        Route::get('empresas', [CompanyController::class, 'index'])->name('companies.index');
        Route::post('empresas', [CompanyController::class, 'store'])->name('companies.store');
        Route::put('empresas/{company}', [CompanyController::class, 'update'])->name('companies.update');

        Route::get('usuarios', [UserController::class, 'index'])->name('users.index');
        Route::post('usuarios', [UserController::class, 'store'])->name('users.store');
        Route::put('usuarios/{user}', [UserController::class, 'update'])->name('users.update');
        Route::delete('usuarios/{user}', [UserController::class, 'destroy'])->name('users.destroy');

        Route::get('historial', VoteHistoryController::class)->name('history');

        Route::get('llaves-api', [ApiClientController::class, 'index'])->name('api-clients.index');
        Route::post('llaves-api', [ApiClientController::class, 'store'])->name('api-clients.store');
        Route::put('llaves-api/{apiClient}', [ApiClientController::class, 'update'])->name('api-clients.update');
        Route::post('llaves-api/{apiClient}/regenerar', [ApiClientController::class, 'regenerate'])->name('api-clients.regenerate');
        Route::delete('llaves-api/{apiClient}', [ApiClientController::class, 'destroy'])->name('api-clients.destroy');

        Route::get('visitantes', [LiveVisitorsController::class, 'index'])->name('visitors.index');
        Route::get('visitantes/reporte', [VisitorReportController::class, 'index'])->name('visitors.report');
        Route::get('visitantes/reporte/visitas', [VisitorReportController::class, 'visits'])->name('visitors.report.visits');

        Route::get('paginas', [AdminPageController::class, 'index'])->name('pages.index');
        Route::post('paginas', [AdminPageController::class, 'store'])->name('pages.store');
        Route::post('paginas/imagen', [AdminPageController::class, 'uploadImage'])->name('pages.upload-image');
        Route::post('paginas/imagenes', [AdminPageController::class, 'uploadImages'])->name('pages.upload-images');
        Route::get('paginas/{page}/editar', [AdminPageController::class, 'edit'])->name('pages.edit');
        Route::put('paginas/{page}', [AdminPageController::class, 'update'])->name('pages.update');
        Route::delete('paginas/{page}', [AdminPageController::class, 'destroy'])->name('pages.destroy');
        Route::post('paginas/{page}/inicio', [AdminPageController::class, 'makeHome'])->name('pages.make-home');
        Route::post('paginas/{page}/vista-previa', [AdminPageController::class, 'preview'])->name('pages.preview');
        Route::get('paginas/{page}/vista-previa', [AdminPageController::class, 'showPreview'])->name('pages.preview.show');

        Route::get('sitio', [SiteLayoutController::class, 'edit'])->name('site.edit');
        Route::put('sitio/header', [SiteLayoutController::class, 'updateHeader'])->name('site.header');
        Route::put('sitio/footer', [SiteLayoutController::class, 'updateFooter'])->name('site.footer');
        Route::put('sitio/contacto', [SiteLayoutController::class, 'updateContact'])->name('site.contact');

        Route::get('blog/categorias', [BlogTaxonomyController::class, 'index'])->name('blog.taxonomies');
        Route::post('blog/categorias', [BlogTaxonomyController::class, 'storeCategory'])->name('blog.categories.store');
        Route::put('blog/categorias/{category}', [BlogTaxonomyController::class, 'updateCategory'])->name('blog.categories.update');
        Route::delete('blog/categorias/{category}', [BlogTaxonomyController::class, 'destroyCategory'])->name('blog.categories.destroy');
        Route::post('blog/etiquetas', [BlogTaxonomyController::class, 'storeTag'])->name('blog.tags.store');
        Route::put('blog/etiquetas/{tag}', [BlogTaxonomyController::class, 'updateTag'])->name('blog.tags.update');
        Route::delete('blog/etiquetas/{tag}', [BlogTaxonomyController::class, 'destroyTag'])->name('blog.tags.destroy');
        Route::get('blog/configuracion', [BlogSettingsController::class, 'edit'])->name('blog.settings.edit');
        Route::put('blog/configuracion', [BlogSettingsController::class, 'update'])->name('blog.settings.update');

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

// Comodín al final: lo que no atienda ninguna otra ruta se busca como página del constructor.
Route::get('{slug}', PageController::class)->fallback()->name('page');
