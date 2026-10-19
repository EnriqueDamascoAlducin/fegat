<?php

namespace Tests\Feature;

use App\Models\SiteLiveVisitor;
use App\Models\SiteVisit;
use App\Models\SiteVisitorSnapshot;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Testing\TestResponse;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class VisitorsTest extends TestCase
{
    use RefreshDatabase;

    private const BROWSER = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';

    protected function setUp(): void
    {
        parent::setUp();

        $this->withoutVite();
    }

    /**
     * @param  array<string, mixed>  $data
     * @param  array<string, string>  $headers
     */
    private function beat(string $token, array $data = [], array $headers = []): TestResponse
    {
        return $this->postJson(route('presence'), ['token' => $token, 'path' => '/', 'device_type' => 'mobile', ...$data], ['User-Agent' => self::BROWSER, ...$headers]);
    }

    public function test_the_heartbeat_records_the_visitor_and_the_pages_it_views()
    {
        $token = (string) Str::uuid();

        $response = $this->beat($token, [
            'path' => '/nosotros?correo=ana@example.com',
            'title' => 'Quiénes somos',
            'new_visit' => true,
            'navigated' => true,
            'utm_source' => 'facebook',
            'referrer_host' => 'l.facebook.com',
        ], ['CF-IPCountry' => 'mx']);

        $response->assertNoContent();
        // Sin sesión ni cookies: el latido no debe abrir una sesión por visitante.
        $this->assertEmpty($response->headers->getCookies());

        $visitor = SiteLiveVisitor::query()->sole();
        $this->assertSame('/nosotros', $visitor->path);
        $this->assertSame('MX', $visitor->country_code);
        $this->assertSame('iOS', $visitor->os);
        $this->assertSame('Safari', $visitor->browser);
        $this->assertSame('facebook', $visitor->utm_source);
        $this->assertSame(1, $visitor->page_views);

        // «Sigo aquí»: no cuenta página nueva.
        $this->beat($token, ['path' => '/nosotros']);
        // Cambio de página.
        $this->beat($token, ['path' => '/blog', 'title' => 'Blog', 'navigated' => true]);

        $visitor->refresh();
        $this->assertSame('/blog', $visitor->path);
        $this->assertSame('/nosotros', $visitor->landing_path);
        $this->assertSame(2, $visitor->page_views);
        $this->assertSame('MX', $visitor->country_code);
        $this->assertSame(['/nosotros', '/blog'], DB::table('site_page_views')->orderBy('id')->pluck('path')->all());
    }

    public function test_bots_bad_heartbeats_and_a_disabled_tracker_are_ignored()
    {
        $this->postJson(route('presence'), ['token' => (string) Str::uuid(), 'path' => '/'], ['User-Agent' => 'Googlebot/2.1'])->assertNoContent();
        $this->beat('no-es-uuid')->assertStatus(422);

        config(['live_visitors.enabled' => false]);
        $this->beat((string) Str::uuid())->assertNoContent();

        $this->assertSame(0, SiteLiveVisitor::query()->count());
    }

    public function test_the_snapshot_archives_visits_and_cleans_old_rows()
    {
        $token = (string) Str::uuid();
        $this->travelTo('2026-10-19 09:00');
        $this->beat($token, ['path' => '/', 'new_visit' => true, 'navigated' => true]);
        $this->travelTo('2026-10-19 09:03');
        $this->beat($token, ['path' => '/proyectos', 'navigated' => true]);

        SiteLiveVisitor::query()->create(['visitor_token' => (string) Str::uuid(), 'path' => '/', 'first_seen_at' => now()->subDays(3), 'last_seen_at' => now()->subDays(3)]);

        $this->artisan('site:visitors-snapshot')->assertSuccessful();

        $snapshot = SiteVisitorSnapshot::query()->sole();
        $this->assertSame(1, $snapshot->active_count);
        $this->assertSame(1, $snapshot->mobile_count);

        $visit = SiteVisit::query()->sole();
        $this->assertSame('/', $visit->landing_path);
        $this->assertSame('/proyectos', $visit->exit_path);
        $this->assertSame(2, $visit->page_views);
        $this->assertSame(180, $visit->duration_seconds);
        $this->assertSame(1, SiteLiveVisitor::query()->count());

        // Correr de nuevo actualiza la misma visita, no la duplica.
        $this->artisan('site:visitors-snapshot')->assertSuccessful();
        $this->assertSame(1, SiteVisit::query()->count());
    }

    public function test_the_admin_sees_live_visitors_and_the_report_with_visited_pages()
    {
        $token = (string) Str::uuid();
        $this->travelTo('2026-10-19 09:00');
        $this->beat($token, ['path' => '/', 'title' => 'Inicio', 'new_visit' => true, 'navigated' => true]);
        $this->beat($token, ['path' => '/blog', 'title' => 'Blog', 'navigated' => true]);
        $this->beat((string) Str::uuid(), ['path' => '/blog', 'title' => 'Blog', 'new_visit' => true, 'navigated' => true]);
        $this->artisan('site:visitors-snapshot');

        $this->actingAs(User::factory()->superAdmin()->create());

        $this->get(route('admin.visitors.index'))->assertOk()->assertInertia(fn (Assert $page) => $page
            ->component('admin/visitors/index')
            ->where('live.total', 2)
            ->where('live.by_page.0.name', 'Blog')
            ->where('live.by_page.0.total', 2)
            ->has('history', 1));

        $this->get(route('admin.visitors.report', ['from' => '2026-10-19', 'to' => '2026-10-19']))->assertOk()->assertInertia(fn (Assert $page) => $page
            ->component('admin/visitors/report')
            ->where('summary.visits', 2)
            ->where('summary.visitors', 2)
            ->where('pages.0.name', '/blog')
            ->where('pages.0.views', 2)
            ->where('pages.0.visitors', 2)
            ->where('devices.0.name', 'mobile')
            ->where('landings.0.visits', 1));

        $this->getJson(route('admin.visitors.report.visits', ['from' => '2026-10-19', 'to' => '2026-10-19', 'dimension' => 'pages', 'value' => '/']))
            ->assertOk()
            ->assertJsonPath('total', 1)
            ->assertJsonPath('visits.0.pages.0.path', '/')
            ->assertJsonPath('visits.0.pages.1.path', '/blog');

        $this->getJson(route('admin.visitors.report.visits', ['dimension' => 'nope', 'value' => 'x']))->assertUnprocessable();
    }

    public function test_logged_in_members_do_not_send_heartbeats_and_only_the_super_admin_sees_the_reports()
    {
        $user = User::factory()->forCompany()->create();

        $this->actingAs($user)->get('/')->assertInertia(fn (Assert $page) => $page->where('liveVisitors.enabled', true));
        $this->get(route('admin.visitors.index'))->assertForbidden();
        $this->get(route('admin.visitors.report'))->assertForbidden();
        $this->getJson(route('admin.visitors.report.visits', ['dimension' => 'devices', 'value' => 'mobile']))->assertForbidden();
    }
}
