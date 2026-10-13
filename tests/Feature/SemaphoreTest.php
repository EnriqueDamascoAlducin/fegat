<?php

namespace Tests\Feature;

use App\Models\VotingSetting;
use App\Services\Semaphore;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;

class SemaphoreTest extends TestCase
{
    use RefreshDatabase;

    /**
     * @param  array{green: int, yellow: int, red: int}  $counts
     */
    #[DataProvider('decisions')]
    public function test_it_decides_the_color(array $counts, int $minVotes, string $expected)
    {
        $this->assertSame($expected, (new Semaphore)->decide($counts, $minVotes));
    }

    /**
     * @return array<string, array{array{green: int, yellow: int, red: int}, int, string}>
     */
    public static function decisions(): array
    {
        return [
            'sin votos' => [['green' => 0, 'yellow' => 0, 'red' => 0], 1, 'waiting'],
            'debajo del quórum' => [['green' => 1, 'yellow' => 0, 'red' => 0], 2, 'waiting'],
            'mayoría verde' => [['green' => 5, 'yellow' => 2, 'red' => 1], 2, 'green'],
            'empate verde no es mayoría' => [['green' => 4, 'yellow' => 2, 'red' => 2], 2, 'yellow'],
            'verde es el más votado pero sin mayoría' => [['green' => 3, 'yellow' => 3, 'red' => 2], 2, 'yellow'],
            'mayoría roja' => [['green' => 1, 'yellow' => 2, 'red' => 5], 2, 'red'],
            'mayoría amarilla' => [['green' => 1, 'yellow' => 5, 'red' => 2], 2, 'yellow'],
            'quórum exacto' => [['green' => 2, 'yellow' => 0, 'red' => 0], 2, 'green'],
        ];
    }

    public function test_same_day_window_phases()
    {
        VotingSetting::current()->update(['opens_at' => '05:00', 'closes_at' => '07:00']);
        $semaphore = new Semaphore;

        $before = $semaphore->session(Carbon::parse('2026-10-12 04:59'));
        $open = $semaphore->session(Carbon::parse('2026-10-12 05:00'));
        $closed = $semaphore->session(Carbon::parse('2026-10-12 07:00'));

        $this->assertSame(['2026-10-12', 'before'], [$before['flight_date'], $before['phase']]);
        $this->assertSame(['2026-10-12', 'open'], [$open['flight_date'], $open['phase']]);
        $this->assertSame(['2026-10-12', 'closed'], [$closed['flight_date'], $closed['phase']]);
    }

    public function test_overnight_window_belongs_to_the_day_it_closes()
    {
        VotingSetting::current()->update(['opens_at' => '20:00', 'closes_at' => '05:00']);
        $semaphore = new Semaphore;

        $evening = $semaphore->session(Carbon::parse('2026-10-12 21:00'));
        $earlyMorning = $semaphore->session(Carbon::parse('2026-10-13 04:00'));
        $midday = $semaphore->session(Carbon::parse('2026-10-13 12:00'));

        $this->assertSame(['2026-10-13', 'open'], [$evening['flight_date'], $evening['phase']]);
        $this->assertSame(['2026-10-13', 'open'], [$earlyMorning['flight_date'], $earlyMorning['phase']]);
        $this->assertSame(['2026-10-13', 'closed'], [$midday['flight_date'], $midday['phase']]);
    }
}
