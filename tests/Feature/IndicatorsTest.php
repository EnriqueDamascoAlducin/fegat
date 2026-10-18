<?php

namespace Tests\Feature;

use App\Models\Company;
use App\Models\FinalDecision;
use App\Models\User;
use App\Models\Vote;
use App\Models\VotingSetting;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class IndicatorsTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        VotingSetting::current()->update(['min_votes' => 2, 'opens_at' => '05:00', 'closes_at' => '07:00']);
        $this->travelTo('2026-10-20 12:00');

        [$a, $b, $c] = Company::factory()->count(3)->create();

        $vote = fn (Company $company, string $date, string $color) => Vote::query()->create([
            'company_id' => $company->id,
            'flight_date' => $date,
            'color' => $color,
        ]);

        // Mayoría verde.
        $vote($a, '2026-10-10', 'green');
        $vote($b, '2026-10-10', 'green');
        $vote($c, '2026-10-10', 'yellow');
        // Empate amarillo-rojo: se cancela.
        $vote($a, '2026-10-11', 'yellow');
        $vote($b, '2026-10-11', 'red');
        // Un solo voto: sin resultado.
        $vote($a, '2026-10-12', 'green');
        // La decisión oficial manda sobre los votos.
        $vote($a, '2026-10-13', 'green');
        $vote($b, '2026-10-13', 'green');
        FinalDecision::query()->create(['flight_date' => '2026-10-13', 'color' => 'red']);
        // Jornada futura: nunca aparece.
        $vote($a, '2026-10-21', 'green');
        $vote($b, '2026-10-21', 'green');
    }

    public function test_guests_cannot_see_the_indicators()
    {
        $this->get(route('indicators'))->assertRedirect(route('login'));
    }

    public function test_every_role_sees_the_result_of_each_day()
    {
        foreach ([User::factory()->forCompany(), User::factory()->decider(), User::factory()->superAdmin()] as $factory) {
            $this->actingAs($factory->create())
                ->get(route('indicators', ['desde' => '2026-10-01', 'hasta' => '2026-10-31']))
                ->assertInertia(fn (Assert $page) => $page
                    ->component('indicators')
                    ->where('filters.hasta', '2026-10-20')
                    ->has('days', 4)
                    ->where('days.0.date', '2026-10-13')
                    ->where('days.0.status', 'red')
                    ->where('days.0.decided', true)
                    ->where('days.1.status', 'waiting')
                    ->where('days.2.status', 'red')
                    ->where('days.3.status', 'green')
                    ->where('days.3.votes', 3));
        }
    }

    public function test_only_the_super_admin_sees_the_vote_breakdown()
    {
        $this->actingAs(User::factory()->forCompany()->create())
            ->get(route('indicators', ['desde' => '2026-10-01']))
            ->assertInertia(fn (Assert $page) => $page
                ->where('showVotes', false)
                ->where('days.3.counts', null));

        $this->actingAs(User::factory()->superAdmin()->create())
            ->get(route('indicators', ['desde' => '2026-10-01']))
            ->assertInertia(fn (Assert $page) => $page
                ->where('showVotes', true)
                ->where('days.3.counts', ['green' => 2, 'yellow' => 1, 'red' => 0]));
    }

    public function test_the_status_filter_is_kept_and_validated()
    {
        $user = User::factory()->forCompany()->create();

        $this->actingAs($user)
            ->get(route('indicators', ['estado' => 'red']))
            ->assertInertia(fn (Assert $page) => $page->where('filters.estado', 'red'));

        $this->actingAs($user)
            ->get(route('indicators', ['estado' => 'purple']))
            ->assertSessionHasErrors('estado');
    }

    public function test_the_range_cannot_exceed_one_year()
    {
        $this->actingAs(User::factory()->forCompany()->create())
            ->get(route('indicators', ['desde' => '2024-01-01', 'hasta' => '2026-10-20']))
            ->assertSessionHasErrors('hasta');
    }

    public function test_the_default_range_starts_two_months_back()
    {
        $this->actingAs(User::factory()->forCompany()->create())
            ->get(route('indicators'))
            ->assertInertia(fn (Assert $page) => $page
                ->where('filters.desde', '2026-08-01')
                ->where('filters.hasta', '2026-10-20'));
    }
}
