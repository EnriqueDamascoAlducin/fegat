<?php

namespace Tests\Feature;

use App\Models\FinalDecision;
use App\Models\FinalDecisionChange;
use App\Models\User;
use App\Models\VotingSetting;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class FinalDecisionTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        VotingSetting::current()->update(['min_votes' => 2, 'opens_at' => '05:00', 'closes_at' => '07:00']);
        $this->travelTo('2026-10-12 06:00');
    }

    private function publicStatus(): array
    {
        auth()->logout();

        return $this->get(route('home'))->viewData('page')['props']['semaphore'];
    }

    public function test_the_decider_color_is_published_regardless_of_the_company_votes()
    {
        foreach (['green', 'green', 'green'] as $color) {
            $this->actingAs(User::factory()->forCompany()->create())->post(route('votes.store'), ['color' => $color]);
        }
        $this->assertSame(['green', false], [$this->publicStatus()['status'], $this->publicStatus()['decided']]);

        $decider = User::factory()->decider()->create();
        $this->actingAs($decider)->post(route('decision.store'), ['color' => 'red'])->assertSessionHasNoErrors();

        $status = $this->publicStatus();
        $this->assertSame(['red', true], [$status['status'], $status['decided']]);
        $this->assertSame(3, $status['votes_count']);
    }

    public function test_the_decision_does_not_need_quorum_or_an_open_window()
    {
        $this->assertSame('waiting', $this->publicStatus()['status']);

        $this->travelTo('2026-10-12 09:30');
        $decider = User::factory()->decider()->create();
        $this->actingAs($decider)->post(route('decision.store'), ['color' => 'yellow']);

        $this->assertSame('yellow', $this->publicStatus()['status']);

        $this->travelTo('2026-10-12 04:00');
        $this->assertSame('yellow', $this->publicStatus()['status']);
    }

    public function test_the_decider_can_change_and_withdraw_the_decision()
    {
        $company = User::factory()->forCompany()->create();
        $this->actingAs($company)->post(route('votes.store'), ['color' => 'green']);
        $this->actingAs(User::factory()->forCompany()->create())->post(route('votes.store'), ['color' => 'green']);

        $decider = User::factory()->decider()->create();
        $this->actingAs($decider)->post(route('decision.store'), ['color' => 'red']);
        $this->actingAs($decider)->post(route('decision.store'), ['color' => 'yellow']);
        $this->actingAs($decider)->post(route('decision.store'), ['color' => 'yellow']);

        $this->assertSame(1, FinalDecision::query()->count());
        $this->assertSame('yellow', $this->publicStatus()['status']);

        $this->actingAs($decider)->delete(route('decision.destroy'));

        $this->assertSame(0, FinalDecision::query()->count());
        $this->assertSame(['green', false], [$this->publicStatus()['status'], $this->publicStatus()['decided']]);
        $this->assertSame(
            [[null, 'red'], ['red', 'yellow'], ['yellow', null]],
            FinalDecisionChange::query()->orderBy('id')->get()
                ->map(fn (FinalDecisionChange $change) => [$change->from_color?->value, $change->to_color?->value])
                ->all(),
        );
    }

    public function test_only_the_decider_can_set_the_final_decision()
    {
        $this->post(route('decision.store'), ['color' => 'red'])->assertRedirect(route('login'));
        $this->actingAs(User::factory()->forCompany()->create())->post(route('decision.store'), ['color' => 'red'])->assertForbidden();
        $this->actingAs(User::factory()->superAdmin()->create())->post(route('decision.store'), ['color' => 'red'])->assertForbidden();
        $this->actingAs(User::factory()->superAdmin()->create())->delete(route('decision.destroy'))->assertForbidden();

        $this->assertSame(0, FinalDecision::query()->count());

        // El decisor no es una empresa: no emite voto de empresa ni entra al panel de administración.
        $decider = User::factory()->decider()->create();
        $this->actingAs($decider)->post(route('votes.store'), ['color' => 'green'])->assertForbidden();
        $this->actingAs($decider)->get(route('admin.users.index'))->assertForbidden();
    }

    public function test_each_role_sees_what_it_should_on_the_dashboard()
    {
        $decider = User::factory()->decider()->create(['name' => 'Capitán Ruiz']);
        $this->actingAs($decider)->post(route('decision.store'), ['color' => 'red']);

        $this->actingAs($decider)->get(route('dashboard'))->assertInertia(fn (Assert $page) => $page
            ->where('canDecide', true)
            ->where('canVote', false)
            ->where('decision.color', 'red')
            ->where('detail', null));

        $this->actingAs(User::factory()->forCompany()->create())->get(route('dashboard'))->assertInertia(fn (Assert $page) => $page
            ->where('canDecide', false)
            ->where('decision', null)
            ->where('semaphore.status', 'red')
            ->where('semaphore.decided', true));

        $admin = User::factory()->superAdmin()->create();
        $this->actingAs($admin)->get(route('dashboard'))->assertInertia(fn (Assert $page) => $page
            ->where('decision.color', 'red')
            ->where('decision.decided_by', 'Capitán Ruiz'));

        $this->actingAs($admin)->get(route('admin.history'))->assertInertia(fn (Assert $page) => $page
            ->where('changes.0.is_decision', true)
            ->where('changes.0.company', 'Decisión final')
            ->where('changes.0.to_color', 'red'));
    }

    public function test_the_super_admin_can_create_a_decider_user()
    {
        $this->actingAs(User::factory()->superAdmin()->create())->post(route('admin.users.store'), [
            'name' => 'Capitán Ruiz',
            'email' => 'capitan@example.com',
            'role' => 'decider',
            'password' => 'una-clave-segura',
        ])->assertSessionHasNoErrors();

        $user = User::query()->where('email', 'capitan@example.com')->sole();
        $this->assertTrue($user->isDecider());
        $this->assertNull($user->company_id);
    }
}
