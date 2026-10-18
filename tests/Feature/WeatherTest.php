<?php

namespace Tests\Feature;

use App\Models\User;
use App\Services\Weather;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class WeatherTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        Http::preventStrayRequests();
    }

    /**
     * Respuesta de Open-Meteo con dos días de pronóstico por hora.
     *
     * @return array<string, mixed>
     */
    private function openMeteo(): array
    {
        $times = [];

        foreach (['2026-10-18', '2026-10-19'] as $day) {
            foreach (range(0, 23) as $hour) {
                $times[] = sprintf('%sT%02d:00', $day, $hour);
            }
        }

        $series = fn (int|float $value) => array_fill(0, count($times), $value);

        return [
            'current' => [
                'time' => '2026-10-18T11:00',
                'temperature_2m' => 19.8,
                'weather_code' => 3,
                'is_day' => 1,
                'wind_speed_10m' => 15.4,
                'wind_direction_10m' => 73,
                'wind_gusts_10m' => 33.5,
                'visibility' => 50140.0,
                'cloud_cover' => 100,
            ],
            'hourly' => [
                'time' => $times,
                'temperature_2m' => $series(8.4),
                'weather_code' => $series(0),
                'is_day' => $series(0),
                'wind_speed_10m' => $series(4.6),
                'wind_speed_120m' => $series(12.2),
                'wind_direction_10m' => $series(180),
                'wind_gusts_10m' => $series(9.7),
                'precipitation_probability' => $series(5),
                'visibility' => $series(24000),
                'cloud_cover' => $series(10),
            ],
            'daily' => [
                'time' => ['2026-10-18', '2026-10-19'],
                'sunrise' => ['2026-10-18T06:49', '2026-10-19T06:50'],
            ],
        ];
    }

    public function test_it_returns_current_conditions_and_the_flight_morning()
    {
        Http::fake(['api.open-meteo.com/*' => Http::response($this->openMeteo())]);

        $forecast = app(Weather::class)->forecast('2026-10-19');

        $this->assertSame(20, $forecast['current']['temperature']);
        $this->assertSame(50.1, $forecast['current']['visibility_km']);
        $this->assertSame('06:50', $forecast['sunrise']);
        $this->assertSame(['05:00', '06:00', '07:00', '08:00', '09:00', '10:00'], array_column($forecast['hours'], 'time'));
        $this->assertSame(5, $forecast['hours'][0]['wind_speed']);
        $this->assertSame(12, $forecast['hours'][0]['wind_speed_120m']);
    }

    public function test_after_the_morning_it_shows_the_next_one()
    {
        Http::fake(['api.open-meteo.com/*' => Http::response($this->openMeteo())]);
        $this->travelTo('2026-10-18 11:30');

        $this->assertSame('2026-10-19', app(Weather::class)->forecast('2026-10-18')['flight_date']);

        $this->travelTo('2026-10-18 06:30');

        $this->assertSame('2026-10-18', app(Weather::class)->forecast('2026-10-18')['flight_date']);
    }

    public function test_the_forecast_is_cached()
    {
        Http::fake(['api.open-meteo.com/*' => Http::response($this->openMeteo())]);

        app(Weather::class)->forecast('2026-10-19');
        app(Weather::class)->forecast('2026-10-19');

        Http::assertSentCount(1);
    }

    public function test_a_failing_service_does_not_break_the_page()
    {
        Http::fake(['api.open-meteo.com/*' => Http::response('error', 500)]);

        $this->assertNull(app(Weather::class)->forecast('2026-10-19'));

        $this->get(route('home'))->assertOk();
    }

    public function test_the_home_page_loads_the_weather_after_rendering()
    {
        Http::fake(['api.open-meteo.com/*' => Http::response($this->openMeteo())]);

        $this->get(route('home'))->assertInertia(fn (Assert $page) => $page
            ->missing('weather')
            ->loadDeferredProps(fn (Assert $reload) => $reload->has('weather.current')));
    }

    public function test_the_dashboard_shows_the_weather()
    {
        Http::fake(['api.open-meteo.com/*' => Http::response($this->openMeteo())]);

        $this->actingAs(User::factory()->create())
            ->get(route('dashboard'))
            ->assertInertia(fn (Assert $page) => $page
                ->missing('weather')
                ->loadDeferredProps(fn (Assert $reload) => $reload->has('weather.hours')));
    }
}
