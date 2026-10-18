<?php

namespace App\Services;

use App\Models\FinalDecision;
use App\Models\Vote;
use App\Models\VotingSetting;

/**
 * Resultado del semáforo jornada por jornada, para los indicadores.
 *
 * El resultado se calcula con la misma regla que el semáforo en vivo. Si la
 * federación cambia el mínimo de votos, se aplica el mínimo vigente también a
 * las jornadas pasadas.
 */
class SemaphoreHistory
{
    public function __construct(private Semaphore $semaphore) {}

    /**
     * Jornadas con votos o decisión final entre dos fechas (Y-m-d), de la más
     * reciente a la más antigua. Nunca incluye jornadas futuras.
     *
     * @return list<array{date: string, status: string, decided: bool, in_progress: bool, votes: int, counts: array{green: int, yellow: int, red: int}}>
     */
    public function between(string $from, string $to): array
    {
        $session = $this->semaphore->session();
        $to = min($to, $session['flight_date']);
        $minVotes = VotingSetting::current()->min_votes;

        /** @var array<string, array{green: int, yellow: int, red: int}> $counts */
        $counts = [];

        $rows = Vote::query()
            ->toBase()
            ->whereBetween('flight_date', [$from, $to])
            ->selectRaw('flight_date, color, count(*) as total')
            ->groupBy('flight_date', 'color')
            ->get();

        foreach ($rows as $row) {
            $date = substr((string) $row->flight_date, 0, 10);
            $day = $counts[$date] ?? ['green' => 0, 'yellow' => 0, 'red' => 0];

            match ($row->color) {
                'green' => $day['green'] = (int) $row->total,
                'yellow' => $day['yellow'] = (int) $row->total,
                'red' => $day['red'] = (int) $row->total,
                default => null,
            };

            $counts[$date] = $day;
        }

        $decisions = FinalDecision::query()
            ->whereBetween('flight_date', [$from, $to])
            ->get(['flight_date', 'color'])
            ->mapWithKeys(fn (FinalDecision $decision) => [substr((string) $decision->flight_date, 0, 10) => $decision->color->value])
            ->all();

        $dates = array_unique([...array_keys($counts), ...array_keys($decisions)]);
        rsort($dates);

        return array_map(function (string $date) use ($counts, $decisions, $minVotes, $session) {
            $dayCounts = $counts[$date] ?? ['green' => 0, 'yellow' => 0, 'red' => 0];
            $decided = isset($decisions[$date]);

            return [
                'date' => $date,
                'status' => $decisions[$date] ?? $this->semaphore->decide($dayCounts, $minVotes),
                'decided' => $decided,
                // La jornada vigente puede cambiar todavía mientras siga abierta.
                'in_progress' => ! $decided && $date === $session['flight_date'] && $session['phase'] !== 'closed',
                'votes' => array_sum($dayCounts),
                'counts' => $dayCounts,
            ];
        }, $dates);
    }
}
