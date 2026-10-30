<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Services\Semaphore;
use App\Services\VoteParticipation;
use Carbon\CarbonImmutable;
use Closure;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class VoteParticipationController extends Controller
{
    /** Rango máximo que se puede consultar de una vez. */
    private const MAX_DAYS = 366;

    /**
     * Reporte de qué empresas faltan más a la votación en un periodo.
     */
    public function __invoke(Request $request, Semaphore $semaphore, VoteParticipation $participation): Response
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
        ]);

        $today = $semaphore->session()['flight_date'];
        $to = min($validated['hasta'] ?? $today, $today);
        $from = $validated['desde'] ?? CarbonImmutable::parse($to)->subDays(29)->toDateString();

        return Inertia::render('admin/participation', [
            'filters' => ['desde' => $from, 'hasta' => $to],
            'today' => $today,
            ...$participation->between($from, $to),
        ]);
    }
}
