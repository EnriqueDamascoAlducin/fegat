<?php

namespace Tests\Feature;

use App\Models\Company;
use App\Models\User;
use App\Models\Vote;
use App\Models\VoteChange;
use App\Models\VotingSetting;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class VotingTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        VotingSetting::current()->update(['min_votes' => 2, 'opens_at' => '05:00', 'closes_at' => '07:00']);
        $this->travelTo('2026-10-12 06:00');
    }

    public function test_a_company_admin_can_vote_during_the_window()
    {
        $user = User::factory()->forCompany()->create();

        $this->actingAs($user)->post(route('votes.store'), ['color' => 'green'])->assertRedirect();

        $this->assertDatabaseHas('votes', [
            'company_id' => $user->company_id,
            'flight_date' => '2026-10-12',
            'color' => 'green',
        ]);
        $this->assertSame(1, VoteChange::query()->count());
    }

    public function test_changing_the_vote_keeps_one_vote_per_company_and_logs_the_change()
    {
        $company = Company::factory()->create();
        $first = User::factory()->forCompany($company)->create();
        $second = User::factory()->forCompany($company)->create();

        $this->actingAs($first)->post(route('votes.store'), ['color' => 'green']);
        $this->actingAs($second)->post(route('votes.store'), ['color' => 'red']);
        $this->actingAs($second)->post(route('votes.store'), ['color' => 'red']);

        $this->assertSame(1, Vote::query()->count());
        $this->assertSame('red', Vote::query()->first()->color->value);
        $this->assertSame(
            [[null, 'green'], ['green', 'red']],
            VoteChange::query()->orderBy('id')->get()
                ->map(fn (VoteChange $change) => [$change->from_color?->value, $change->to_color->value])
                ->all(),
        );
    }

    public function test_voting_is_rejected_outside_the_window()
    {
        $user = User::factory()->forCompany()->create();
        $this->travelTo('2026-10-12 07:30');

        $this->actingAs($user)->post(route('votes.store'), ['color' => 'green'])
            ->assertSessionHasErrors('color');

        $this->assertSame(0, Vote::query()->count());
    }

    public function test_only_admins_of_active_companies_can_vote()
    {
        $superAdmin = User::factory()->superAdmin()->create();
        $inactive = User::factory()->forCompany(Company::factory()->create(['is_active' => false]))->create();

        $this->post(route('votes.store'), ['color' => 'green'])->assertRedirect(route('login'));
        $this->actingAs($superAdmin)->post(route('votes.store'), ['color' => 'green'])->assertForbidden();
        $this->actingAs($inactive)->post(route('votes.store'), ['color' => 'green'])->assertForbidden();

        $this->assertSame(0, Vote::query()->count());
    }

    public function test_a_company_only_sees_its_own_vote()
    {
        $user = User::factory()->forCompany()->create();
        $other = User::factory()->forCompany()->create();

        $this->actingAs($other)->post(route('votes.store'), ['color' => 'red']);
        $this->actingAs($user)->post(route('votes.store'), ['color' => 'green']);

        $this->actingAs($user)->get(route('dashboard'))
            ->assertInertia(fn (Assert $page) => $page
                ->component('dashboard')
                ->where('myVote', 'green')
                ->where('detail', null)
                ->where('semaphore.votes_count', 2)
                ->where('semaphore.status', 'red')
                ->missing('semaphore.counts'));
    }

    public function test_the_public_page_shows_the_result_without_the_breakdown()
    {
        foreach (['green', 'green', 'red'] as $color) {
            $this->actingAs(User::factory()->forCompany()->create())->post(route('votes.store'), ['color' => $color]);
        }
        auth()->logout();

        $this->get(route('home'))
            ->assertInertia(fn (Assert $page) => $page
                ->component('welcome')
                ->where('semaphore.status', 'green')
                ->where('semaphore.votes_count', 3)
                ->missing('semaphore.counts')
                ->missing('detail'));
    }

    public function test_the_semaphore_waits_until_the_quorum_is_reached()
    {
        $this->actingAs(User::factory()->forCompany()->create())->post(route('votes.store'), ['color' => 'green']);
        auth()->logout();

        $this->get(route('home'))
            ->assertInertia(fn (Assert $page) => $page->where('semaphore.status', 'waiting'));
    }

    public function test_the_super_admin_sees_every_vote()
    {
        $voter = User::factory()->forCompany()->create();
        $this->actingAs($voter)->post(route('votes.store'), ['color' => 'yellow']);

        $this->actingAs(User::factory()->superAdmin()->create())->get(route('dashboard'))
            ->assertInertia(fn (Assert $page) => $page
                ->where('detail.counts.yellow', 1)
                ->where('detail.votes.0.company', $voter->company->name)
                ->where('detail.votes.0.color', 'yellow'));
    }

    public function test_admin_pages_are_only_for_the_super_admin()
    {
        $companyAdmin = User::factory()->forCompany()->create();
        $superAdmin = User::factory()->superAdmin()->create();

        foreach (['admin.voting.edit', 'admin.companies.index', 'admin.users.index', 'admin.history'] as $route) {
            $this->actingAs($companyAdmin)->get(route($route))->assertForbidden();
            $this->actingAs($superAdmin)->get(route($route))->assertOk();
        }

        $this->actingAs($companyAdmin)
            ->put(route('admin.voting.update'), ['min_votes' => 1, 'opens_at' => '00:00', 'closes_at' => '23:59'])
            ->assertForbidden();
    }

    public function test_the_super_admin_can_change_the_quorum_and_the_window()
    {
        $this->actingAs(User::factory()->superAdmin()->create())
            ->put(route('admin.voting.update'), ['min_votes' => 4, 'opens_at' => '04:30', 'closes_at' => '06:45'])
            ->assertRedirect(route('admin.voting.edit'));

        $this->assertSame(
            ['min_votes' => 4, 'opens_at' => '04:30', 'closes_at' => '06:45'],
            VotingSetting::current()->only(['min_votes', 'opens_at', 'closes_at']),
        );
    }

    public function test_the_super_admin_can_hide_the_semaphore_from_the_public_page()
    {
        $admin = User::factory()->superAdmin()->create();
        $settings = ['min_votes' => 2, 'opens_at' => '05:00', 'closes_at' => '07:00'];

        $this->actingAs($admin)->put(route('admin.voting.update'), $settings);

        $this->assertFalse(VotingSetting::current()->public_visible);
        $this->get(route('home'))->assertInertia(fn (Assert $page) => $page->where('semaphore', null));

        // Ocultarlo no detiene la votación ni el panel.
        $voter = User::factory()->forCompany()->create();
        $this->actingAs($voter)->post(route('votes.store'), ['color' => 'green'])->assertSessionHasNoErrors();
        $this->actingAs($voter)->get(route('dashboard'))
            ->assertInertia(fn (Assert $page) => $page->where('myVote', 'green')->where('publicVisible', false));

        $this->actingAs($admin)->put(route('admin.voting.update'), [...$settings, 'public_visible' => '1']);
        auth()->logout();

        $this->get(route('home'))->assertInertia(fn (Assert $page) => $page->where('semaphore.status', 'waiting'));
    }
}
