<?php

namespace Tests\Feature;

use App\Models\Company;
use App\Models\FinalDecision;
use App\Models\User;
use App\Models\Vote;
use App\Models\VotingSetting;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Testing\Fluent\AssertableJson;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class VoteParticipationTest extends TestCase
{
    use RefreshDatabase;

    private Company $always;

    private Company $absent;

    protected function setUp(): void
    {
        parent::setUp();

        $this->withoutVite();

        VotingSetting::current()->update(['min_votes' => 2, 'opens_at' => '05:00', 'closes_at' => '07:00']);
        $this->travelTo('2026-10-20 12:00');

        $this->always = Company::factory()->create(['name' => 'Siempre vota', 'created_at' => '2026-09-01']);
        $this->absent = Company::factory()->create(['name' => 'Falta seguido', 'created_at' => '2026-09-01']);
        User::factory()->create(['role' => 'company_admin', 'company_id' => $this->always->id]);

        foreach (['2026-10-10', '2026-10-11', '2026-10-12'] as $date) {
            $this->vote($this->always, $date);
        }

        $this->vote($this->absent, '2026-10-10');
    }

    private function vote(Company $company, string $date): void
    {
        Vote::query()->create(['company_id' => $company->id, 'flight_date' => $date, 'color' => 'green']);
    }

    private function report(array $query = ['desde' => '2026-10-01', 'hasta' => '2026-10-31'])
    {
        return $this->actingAs(User::factory()->superAdmin()->create())->get(route('admin.participation', $query));
    }

    public function test_only_the_super_admin_can_see_the_report()
    {
        $this->get(route('admin.participation'))->assertRedirect(route('login'));
        $this->actingAs(User::factory()->forCompany()->create())->get(route('admin.participation'))->assertForbidden();
        $this->report([])->assertOk();
    }

    public function test_it_ranks_first_the_company_that_misses_the_most()
    {
        $this->report()->assertInertia(fn (Assert $page) => $page
            ->component('admin/participation')
            ->where('filters.hasta', '2026-10-20')
            ->where('dates_count', 3)
            ->has('companies', 2)
            ->has('companies.0', fn (AssertableJson $row) => $row
                ->where('name', 'Falta seguido')
                ->where('has_voters', false)
                ->where('eligible', 3)
                ->where('voted', 1)
                ->where('missed', 2)
                ->where('missed_percent', 67)
                ->where('streak', 2)
                ->where('missed_dates', ['2026-10-12', '2026-10-11'])
                ->etc())
            ->where('companies.1.name', 'Siempre vota')
            ->where('companies.1.has_voters', true)
            ->where('companies.1.missed', 0)
            ->where('companies.1.streak', 0)
        );
    }

    public function test_a_voted_day_ends_the_streak_of_misses()
    {
        $this->vote($this->absent, '2026-10-12');

        $this->report()->assertInertia(fn (Assert $page) => $page
            ->where('companies.0.name', 'Falta seguido')
            ->where('companies.0.missed', 1)
            ->where('companies.0.streak', 0)
        );
    }

    public function test_days_without_company_votes_do_not_count()
    {
        FinalDecision::query()->create(['flight_date' => '2026-10-15', 'color' => 'red']);

        $this->report()->assertInertia(fn (Assert $page) => $page->where('dates_count', 3));
    }

    public function test_the_session_still_open_does_not_count_until_it_closes()
    {
        $this->travelTo('2026-10-20 06:00');
        $this->vote($this->always, '2026-10-20');

        $this->report()->assertInertia(fn (Assert $page) => $page->where('dates_count', 3));

        $this->travelTo('2026-10-20 07:00');

        $this->report()->assertInertia(fn (Assert $page) => $page
            ->where('dates_count', 4)
            ->where('companies.0.missed', 3)
        );
    }

    public function test_a_company_is_counted_from_the_day_after_it_was_created()
    {
        Company::factory()->create(['name' => 'Nueva', 'created_at' => '2026-10-11 09:00']);

        $this->report()->assertInertia(fn (Assert $page) => $page
            ->where('companies.1.name', 'Nueva')
            ->where('companies.1.eligible', 1)
            ->where('companies.1.missed', 1)
            ->where('companies.1.missed_percent', 100)
        );
    }

    public function test_inactive_companies_are_left_out()
    {
        $this->absent->update(['is_active' => false]);

        $this->report()->assertInertia(fn (Assert $page) => $page
            ->has('companies', 1)
            ->where('companies.0.name', 'Siempre vota')
        );
    }

    public function test_the_range_cannot_exceed_a_year()
    {
        $this->report(['desde' => '2025-01-01', 'hasta' => '2026-10-20'])->assertSessionHasErrors('hasta');
    }
}
