<?php

namespace App\Http\Controllers;

use App\Enums\VoteColor;
use App\Models\Vote;
use App\Models\VoteChange;
use App\Services\Semaphore;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;

class VoteController extends Controller
{
    /**
     * Registra el voto de la empresa o lo cambia si ya había votado.
     */
    public function store(Request $request, Semaphore $semaphore): RedirectResponse
    {
        $user = $request->user();

        abort_unless($user->canVote(), 403);

        $validated = $request->validate([
            'color' => ['required', Rule::enum(VoteColor::class)],
        ]);

        $session = $semaphore->session();

        if ($session['phase'] !== 'open') {
            throw ValidationException::withMessages([
                'color' => "La votación está cerrada. Horario: {$session['opens_at']} a {$session['closes_at']}.",
            ]);
        }

        $color = VoteColor::from($validated['color']);

        DB::transaction(function () use ($user, $session, $color) {
            $vote = Vote::query()
                ->where('company_id', $user->company_id)
                ->where('flight_date', $session['flight_date'])
                ->lockForUpdate()
                ->first();

            $previous = $vote?->color;

            if ($previous === $color) {
                return;
            }

            if ($vote) {
                $vote->update(['color' => $color, 'user_id' => $user->id]);
            } else {
                $vote = Vote::query()->create([
                    'company_id' => $user->company_id,
                    'flight_date' => $session['flight_date'],
                    'color' => $color,
                    'user_id' => $user->id,
                ]);
            }

            VoteChange::query()->create([
                'vote_id' => $vote->id,
                'company_id' => $user->company_id,
                'flight_date' => $session['flight_date'],
                'user_id' => $user->id,
                'user_name' => $user->name,
                'from_color' => $previous,
                'to_color' => $color,
            ]);
        });

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Voto registrado.']);

        return back();
    }
}
