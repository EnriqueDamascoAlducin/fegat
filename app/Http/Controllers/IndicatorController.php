<?php

namespace App\Http\Controllers;

use App\Services\Semaphore;
use App\Services\SemaphoreHistory;
use Carbon\CarbonImmutable;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class IndicatorController extends Controller
{
    /** Rango máximo que se puede consultar de una vez. */
    private const MAX_DAYS = 366;

    /**
     * Indicadores del semáforo: qué jornadas fueron verdes, amarillas o rojas.
     * Todos los usuarios los ven; solo el super admin ve el desglose de votos.
     */
    public function __invoke(Request $request, Semaphore $semaphore, SemaphoreHistory $history): Response
    {
        $validated = $request->validate([
            'desde' => ['nullable', 'date_format:Y-m-d'],
            'hasta' => [
                'nullable',
                'date_format:Y-m-d',
                'after_or_equal:desde',
                function (string $attribute, mixed $value, Closure $fail) use ($request) {
                    if ($request->filled('desde') && CarbonImmutable::parse($request->input('desde'))->diffInDays($value) >= self::MAX_DAYS) {
                        $fail('El rango no puede ser mayor a un año.');
                    }
                },
            ],
            'estado' => ['nullable', Rule::in(['green', 'yellow', 'red', 'waiting'])],
        ]);

        $today = $semaphore->session()['flight_date'];
        // No hay jornadas futuras que mostrar.
        $to = min($validated['hasta'] ?? $today, $today);
        $from = $validated['desde'] ?? CarbonImmutable::parse($to)->subMonthsNoOverflow(2)->startOfMonth()->toDateString();

        $days = $history->between($from, $to);
        $showVotes = $request->user()->isSuperAdmin();

        if (! $showVotes) {
            $days = array_map(fn (array $day) => [...$day, 'counts' => null], $days);
        }

        return Inertia::render('indicators', [
            'filters' => [
                'desde' => $from,
                'hasta' => $to,
                'estado' => $validated['estado'] ?? null,
            ],
            'today' => $today,
            'days' => $days,
            'showVotes' => $showVotes,
        ]);
    }
}
