<?php

namespace Tests\Feature\Auth;

use App\Enums\UserRole;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class UsernameLoginTest extends TestCase
{
    use RefreshDatabase;

    public function test_users_can_authenticate_with_their_alias(): void
    {
        $user = User::factory()->create(['username' => 'aerostat']);

        $this->post(route('login.store'), [
            'email' => 'Aerostat',
            'password' => 'password',
        ])->assertRedirect(route('dashboard', absolute: false));

        $this->assertAuthenticatedAs($user);
    }

    public function test_users_can_still_authenticate_with_their_email(): void
    {
        $user = User::factory()->create(['username' => 'aerostat']);

        $this->post(route('login.store'), [
            'email' => $user->email,
            'password' => 'password',
        ]);

        $this->assertAuthenticatedAs($user);
    }

    public function test_alias_with_wrong_password_is_rejected(): void
    {
        User::factory()->create(['username' => 'aerostat']);

        $this->post(route('login.store'), [
            'email' => 'aerostat',
            'password' => 'wrong-password',
        ])->assertSessionHasErrors('email');

        $this->assertGuest();
    }

    public function test_alias_is_stored_in_lowercase(): void
    {
        $user = User::factory()->create(['username' => '  Globo.Uno ']);

        $this->assertSame('globo.uno', $user->fresh()->username);
    }

    public function test_super_admin_can_assign_an_alias(): void
    {
        $admin = User::factory()->create(['role' => UserRole::SuperAdmin]);
        $user = User::factory()->create(['role' => UserRole::Decider]);

        $this->actingAs($admin)->put(route('admin.users.update', $user), [
            'name' => $user->name,
            'email' => $user->email,
            'username' => 'decisor',
            'role' => UserRole::Decider->value,
        ])->assertSessionHasNoErrors();

        $this->assertSame('decisor', $user->fresh()->username);
    }

    public function test_alias_must_be_unique_and_cannot_contain_an_at_sign(): void
    {
        User::factory()->create(['username' => 'aerostat']);
        $user = User::factory()->create();

        $this->actingAs($user)->patch(route('profile.update'), [
            'name' => $user->name,
            'email' => $user->email,
            'username' => 'aerostat',
        ])->assertSessionHasErrors('username');

        $this->actingAs($user)->patch(route('profile.update'), [
            'name' => $user->name,
            'email' => $user->email,
            'username' => 'yo@globo',
        ])->assertSessionHasErrors('username');
    }

    public function test_users_can_set_and_clear_their_own_alias(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)->patch(route('profile.update'), [
            'name' => $user->name,
            'email' => $user->email,
            'username' => 'mi-alias',
        ])->assertSessionHasNoErrors();

        $this->assertSame('mi-alias', $user->fresh()->username);

        $this->actingAs($user)->patch(route('profile.update'), [
            'name' => $user->name,
            'email' => $user->email,
            'username' => '',
        ])->assertSessionHasNoErrors();

        $this->assertNull($user->fresh()->username);
    }
}
