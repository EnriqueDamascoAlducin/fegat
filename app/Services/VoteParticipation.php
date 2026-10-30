<?php

namespace App\Services;

use App\Enums\UserRole;
use App\Models\Company;
use App\Models\Vote;

/**
 * Cumplimiento de la votación por empresa: en cuántas jornadas votó y en cuántas faltó.
 *
 * Solo cuentan las jornadas ya cerradas en las que votó al menos una empresa: si
 * nadie votó no hay forma de saber si hubo operación ese día. A cada empresa se
 * le cuenta desde el día siguiente a su alta, y las inactivas no aparecen.
 */
class VoteParticipation
{
    public function __construct(private Semaphore $semaphore) {}

    /**
     * Empresas activas entre dos fechas (Y-m-d), de la que más falta a la que menos.
     *
     * @return array{dates_count: int, companies: array<int, array{id: int, name: string, has_voters: bool, eligible: int, voted: int, missed: int, missed_percent: int|null, streak: int, missed_dates: list<string>}>}
     */
    public function between(string $from, string $to): array
    {
        $session = $this->semaphore->session();

        $rows = Vote::query()
            ->toBase()
            ->whereBetween('flight_date', [$from, min($to, $session['flight_date'])])
            ->when(
                // La jornada vigente sigue abierta: todavía nadie ha faltado.
                $session['phase'] !== 'closed',
                fn ($query) => $query->where('flight_date', '<>', $session['flight_date']),
            )
            ->get(['company_id', 'flight_date']);

        /** @var array<int, array<string, true>> $votes */
        $votes = [];

        foreach ($rows as $row) {
            $votes[$row->company_id][substr((string) $row->flight_date, 0, 10)] = true;
        }

        $dates = $rows->map(fn ($row) => substr((string) $row->flight_date, 0, 10))->unique()->sortDesc()->values()->all();

        $companies = Company::query()
            ->where('is_active', true)
            ->withCount(['users as voters_count' => fn ($query) => $query->where('role', UserRole::CompanyAdmin)])
            ->orderBy('name')
            ->get()
            ->map(function (Company $company) use ($dates, $votes) {
                $voted = $votes[$company->id] ?? [];
                $createdOn = $company->created_at?->toDateString() ?? '';

                $eligible = array_values(array_filter(
                    $dates,
                    fn (string $date) => $date > $createdOn || isset($voted[$date]),
                ));
                $missed = array_values(array_filter($eligible, fn (string $date) => ! isset($voted[$date])));

                $streak = 0;

                foreach ($eligible as $date) {
                    if (isset($voted[$date])) {
                        break;
                    }

                    $streak++;
                }

                return [
                    'id' => $company->id,
                    'name' => $company->name,
                    'has_voters' => $company->voters_count > 0,
                    'eligible' => count($eligible),
                    'voted' => count($eligible) - count($missed),
                    'missed' => count($missed),
                    'missed_percent' => $eligible === [] ? null : (int) round(count($missed) / count($eligible) * 100),
                    'streak' => $streak,
                    'missed_dates' => $missed,
                ];
            })
            ->sortBy([['missed', 'desc'], ['missed_percent', 'desc']])
            ->values()
            ->all();

        return ['dates_count' => count($dates), 'companies' => $companies];
    }
}
