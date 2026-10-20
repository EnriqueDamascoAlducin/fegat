<?php

namespace App\Providers;

use App\Contracts\WhatsAppSender;
use App\Http\Middleware\AuthenticateApiClient;
use App\Support\WhatsApp\TwilioWhatsApp;
use Carbon\CarbonImmutable;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Date;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;
use Illuminate\Validation\Rules\Password;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        $this->app->singleton(WhatsAppSender::class, TwilioWhatsApp::class);
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        $this->configureDefaults();

        // API: 60 consultas por minuto por llave (o por IP si aún no se identificó).
        RateLimiter::for('api-clients', fn (Request $request) => Limit::perMinute(60)->by(
            'api-client:'.($request->attributes->get(AuthenticateApiClient::ATTRIBUTE)->id ?? $request->ip()),
        ));
    }

    /**
     * Configure default behaviors for production-ready applications.
     */
    protected function configureDefaults(): void
    {
        Date::use(CarbonImmutable::class);

        DB::prohibitDestructiveCommands(
            app()->isProduction(),
        );

        Password::defaults(fn (): ?Password => app()->isProduction()
            ? Password::min(12)
                ->mixedCase()
                ->letters()
                ->numbers()
                ->symbols()
                ->uncompromised()
            : null,
        );
    }
}
