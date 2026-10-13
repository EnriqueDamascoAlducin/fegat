<?php

namespace App\Services;

use App\Enums\VoteColor;
use App\Models\Company;
use App\Models\Vote;
use App\Models\VotingSetting;
use Carbon\CarbonImmutable;
use DateTimeInterface;

class Semaphore
{
    /**
     * Jornada de votación vigente: para qué fecha de vuelo se vota y en qué fase está.
     *
     * Si el horario cruza la medianoche (abre 20:00, cierra 05:00) la jornada
     * pertenece al día en que cierra, que es el día del vuelo.
     *
     * @return array{flight_date: string, phase: 'before'|'open'|'closed', opens_at: string, closes_at: string}
     */
    public function session(?DateTimeInterface $now = null): array
    {
        $now = CarbonImmutable::instance($now ?? now());
        $settings = VotingSetting::current();

        $open = $now->setTimeFromTimeString($settings->opens_at);
        $close = $now->setTimeFromTimeString($settings->closes_at);

        if ($open->lt($close)) {
            $flightDate = $now;
            $phase = match (true) {
                $now->lt($open) => 'before',
                $now->lt($close) => 'open',
                default => 'closed',
            };
        } elseif ($now->gte($open)) {
            $flightDate = $now->addDay();
            $phase = 'open';
        } else {
            $flightDate = $now;
            $phase = $now->lt($close) ? 'open' : 'closed';
        }

        return [
            'flight_date' => $flightDate->toDateString(),
            'phase' => $phase,
            'opens_at' => $settings->opens_at,
            'closes_at' => $settings->closes_at,
        ];
    }

    /**
     * Regla del semáforo. Verde solo con mayoría de votos verdes; rojo con
     * mayoría de rojos; cualquier otro reparto queda en amarillo.
     *
     * @param  array{green: int, yellow: int, red: int}  $counts
     * @return 'waiting'|'green'|'yellow'|'red'
     */
    public function decide(array $counts, int $minVotes): string
    {
        $total = $counts['green'] + $counts['yellow'] + $counts['red'];

        return match (true) {
            $total === 0, $total < $minVotes => 'waiting',
            $total < $counts['green'] * 2 => VoteColor::Green->value,
            $total < $counts['red'] * 2 => VoteColor::Red->value,
            default => VoteColor::Yellow->value,
        };
    }

    /**
     * @return array{green: int, yellow: int, red: int}
     */
    public function counts(string $flightDate): array
    {
        $counts = Vote::query()
            ->toBase()
            ->where('flight_date', $flightDate)
            ->selectRaw('color, count(*) as total')
            ->groupBy('color')
            ->pluck('total', 'color');

        return [
            'green' => (int) ($counts[VoteColor::Green->value] ?? 0),
            'yellow' => (int) ($counts[VoteColor::Yellow->value] ?? 0),
            'red' => (int) ($counts[VoteColor::Red->value] ?? 0),
        ];
    }

    /**
     * Estado público del semáforo: nunca incluye el desglose de votos.
     *
     * @return array{status: string, phase: string, flight_date: string, opens_at: string, closes_at: string, votes_count: int, companies_count: int, min_votes: int}
     */
    public function status(?DateTimeInterface $now = null): array
    {
        $session = $this->session($now);
        $counts = $this->counts($session['flight_date']);
        $minVotes = VotingSetting::current()->min_votes;

        return [
            ...$session,
            'status' => $session['phase'] === 'before' ? 'not_open' : $this->decide($counts, $minVotes),
            'votes_count' => array_sum($counts),
            'companies_count' => Company::query()->where('is_active', true)->count(),
            'min_votes' => $minVotes,
        ];
    }
}
