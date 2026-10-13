<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\VoteChange;
use App\Services\Semaphore;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class VoteHistoryController extends Controller
{
    /**
     * Bitácora de votos y cambios de voto de una jornada.
     */
    public function __invoke(Request $request, Semaphore $semaphore): Response
    {
        $validated = $request->validate([
            'fecha' => ['nullable', 'date_format:Y-m-d'],
        ]);

        $date = $validated['fecha'] ?? $semaphore->session()['flight_date'];
        $counts = $semaphore->counts($date);

        return Inertia::render('admin/history', [
            'date' => $date,
            'counts' => $counts,
            'changes' => VoteChange::query()
                ->with('company:id,name')
                ->where('flight_date', $date)
                ->latest('id')
                ->get()
                ->map(fn (VoteChange $change) => [
                    'id' => $change->id,
                    'company' => $change->company->name,
                    'user_name' => $change->user_name,
                    'from_color' => $change->from_color?->value,
                    'to_color' => $change->to_color->value,
                    'at' => $change->created_at?->format('H:i:s'),
                ]),
        ]);
    }
}
