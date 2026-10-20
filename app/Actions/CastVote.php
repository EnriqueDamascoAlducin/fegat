<?php

namespace App\Actions;

use App\Enums\VoteColor;
use App\Exceptions\VotingClosedException;
use App\Models\User;
use App\Models\Vote;
use App\Models\VoteChange;
use App\Services\Semaphore;
use Illuminate\Support\Facades\DB;

/**
 * Registra el voto de la empresa o lo cambia si ya había votado, venga de la
 * web o de WhatsApp. Quien llama ya comprobó que el usuario puede votar.
 */
class CastVote
{
    public function __construct(private Semaphore $semaphore) {}

    /**
     * @param  'web'|'whatsapp'  $channel
     * @return array{flight_date: string, changed: bool}
     *
     * @throws VotingClosedException
     */
    public function handle(User $user, VoteColor $color, string $channel = 'web'): array
    {
        $session = $this->semaphore->session();

        if ($session['phase'] !== 'open') {
            throw new VotingClosedException($session['opens_at'], $session['closes_at']);
        }

        $changed = DB::transaction(function () use ($user, $session, $color, $channel) {
            $vote = Vote::query()
                ->where('company_id', $user->company_id)
                ->where('flight_date', $session['flight_date'])
                ->lockForUpdate()
                ->first();

            $previous = $vote?->color;

            if ($previous === $color) {
                return false;
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
                'channel' => $channel,
            ]);

            return true;
        });

        return ['flight_date' => $session['flight_date'], 'changed' => $changed];
    }
}
