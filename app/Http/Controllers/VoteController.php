<?php

namespace App\Http\Controllers;

use App\Actions\CastVote;
use App\Enums\VoteColor;
use App\Exceptions\VotingClosedException;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;

class VoteController extends Controller
{
    /**
     * Registra el voto de la empresa o lo cambia si ya había votado.
     */
    public function store(Request $request, CastVote $castVote): RedirectResponse
    {
        $user = $request->user();

        abort_unless($user->canVote(), 403);

        $validated = $request->validate([
            'color' => ['required', Rule::enum(VoteColor::class)],
        ]);

        try {
            $castVote->handle($user, VoteColor::from($validated['color']));
        } catch (VotingClosedException $exception) {
            throw ValidationException::withMessages(['color' => $exception->getMessage()]);
        }

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Voto registrado.']);

        return back();
    }
}
