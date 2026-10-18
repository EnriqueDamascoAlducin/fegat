<?php

namespace Tests\Feature\Auth;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Route;
use Laravel\Fortify\Features;
use Tests\TestCase;

/**
 * No hay registro público: las cuentas solo las da de alta el super admin.
 */
class RegistrationDisabledTest extends TestCase
{
    use RefreshDatabase;

    public function test_the_registration_feature_is_off(): void
    {
        $this->assertFalse(Features::enabled(Features::registration()));
        $this->assertFalse(Route::has('register'));
        $this->assertFalse(Route::has('register.store'));
    }

    public function test_nobody_can_open_or_submit_the_registration_form(): void
    {
        $this->get('/register')->assertNotFound();

        // 405: la ruta comodín de páginas solo atiende GET.
        $status = $this->post('/register', [
            'name' => 'Intruso',
            'email' => 'intruso@example.com',
            'password' => 'password',
            'password_confirmation' => 'password',
        ])->getStatusCode();

        $this->assertContains($status, [404, 405]);

        $this->assertDatabaseMissing(User::class, ['email' => 'intruso@example.com']);
        $this->assertGuest();
    }
}
