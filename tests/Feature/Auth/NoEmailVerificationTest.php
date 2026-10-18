<?php

namespace Tests\Feature\Auth;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class NoEmailVerificationTest extends TestCase
{
    use RefreshDatabase;

    public function test_users_without_a_verified_email_can_use_the_panel(): void
    {
        $user = User::factory()->unverified()->create();

        $this->actingAs($user)->get(route('dashboard'))->assertOk();
    }

    public function test_changing_the_email_does_not_lock_the_user_out(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)->patch(route('profile.update'), [
            'name' => $user->name,
            'email' => 'nuevo@fegat.test',
        ])->assertSessionHasNoErrors();

        $this->actingAs($user->fresh())->get(route('dashboard'))->assertOk();
    }
}
