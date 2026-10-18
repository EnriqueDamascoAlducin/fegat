<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\FinalDecisionChange;
use App\Models\VoteChange;
use App\Services\Semaphore;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class VoteHistoryController extends Controller
{
    /**
     * Bitácora de una jornada: votos de las empresas y decisiones finales.
     */
    public function __invoke(Request $request, Semaphore $semaphore): Response
    {
        $validated = $request->validate([
            'fecha' => ['nullable', 'date_format:Y-m-d'],
        ]);

        $date = $validated['fecha'] ?? $semaphore->session()['flight_date'];

        $votes = VoteChange::query()
            ->with('company:id,name')
            ->where('flight_date', $date)
            ->get()
            ->map(fn (VoteChange $change) => [
                'id' => 'voto-'.$change->id,
                'is_decision' => false,
                'company' => $change->company->name,
                'user_name' => $change->user_name,
                'from_color' => $change->from_color?->value,
                'to_color' => $change->to_color->value,
                'at' => $change->created_at,
            ]);

        $decisions = FinalDecisionChange::query()
            ->where('flight_date', $date)
            ->get()
            ->map(fn (FinalDecisionChange $change) => [
                'id' => 'decision-'.$change->id,
                'is_decision' => true,
                'company' => 'Decisión final',
                'user_name' => $change->user_name,
                'from_color' => $change->from_color?->value,
                'to_color' => $change->to_color?->value,
                'at' => $change->created_at,
            ]);

        return Inertia::render('admin/history', [
            'date' => $date,
            'counts' => $semaphore->counts($date),
            'changes' => $votes->concat($decisions)
                ->sortByDesc('at')
                ->values()
                ->map(fn (array $row) => [...$row, 'at' => $row['at']?->format('H:i:s')]),
        ]);
    }
}
