<?php

namespace App\Http\Controllers;

use App\Enums\VoteColor;
use App\Models\FinalDecision;
use App\Models\FinalDecisionChange;
use App\Models\User;
use App\Services\Semaphore;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Inertia\Inertia;

class DecisionController extends Controller
{
    /**
     * Fija (o cambia) el color que se publica para la jornada vigente.
     * A diferencia del voto de las empresas, no depende del horario de votación.
     */
    public function store(Request $request, Semaphore $semaphore): RedirectResponse
    {
        abort_unless($request->user()->isDecider(), 403);

        $validated = $request->validate([
            'color' => ['required', Rule::enum(VoteColor::class)],
        ]);

        $this->apply($request->user(), $semaphore->session()['flight_date'], VoteColor::from($validated['color']));

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Decisión publicada.']);

        return back();
    }

    /**
     * Retira la decisión: el semáforo vuelve a calcularse con los votos.
     */
    public function destroy(Request $request, Semaphore $semaphore): RedirectResponse
    {
        abort_unless($request->user()->isDecider(), 403);

        $this->apply($request->user(), $semaphore->session()['flight_date'], null);

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Decisión retirada.']);

        return back();
    }

    private function apply(User $user, string $flightDate, ?VoteColor $color): void
    {
        DB::transaction(function () use ($user, $flightDate, $color) {
            $decision = FinalDecision::query()->where('flight_date', $flightDate)->lockForUpdate()->first();
            $previous = $decision?->color;

            if ($previous === $color) {
                return;
            }

            if ($color === null) {
                $decision->delete();
            } elseif ($decision) {
                $decision->update(['color' => $color, 'user_id' => $user->id]);
            } else {
                FinalDecision::query()->create(['flight_date' => $flightDate, 'color' => $color, 'user_id' => $user->id]);
            }

            FinalDecisionChange::query()->create([
                'flight_date' => $flightDate,
                'user_id' => $user->id,
                'user_name' => $user->name,
                'from_color' => $previous,
                'to_color' => $color,
            ]);
        });
    }
}
