<?php

namespace App\Http\Controllers\Webhooks;

use App\Actions\CastVote;
use App\Enums\VoteColor;
use App\Exceptions\VotingClosedException;
use App\Http\Controllers\Controller;
use App\Models\User;
use Carbon\CarbonImmutable;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Str;
use Twilio\TwiML\MessagingResponse;

/**
 * Twilio llama aquí cada vez que alguien escribe al WhatsApp de FEGAT. Si el
 * mensaje es la respuesta a la encuesta (o un color escrito), se registra el
 * voto de su empresa y se le contesta en el mismo chat.
 */
class TwilioWhatsAppController extends Controller
{
    /** Botones de la plantilla de encuesta (su «ID» en Twilio). */
    private const BUTTONS = [
        'vote_green' => VoteColor::Green,
        'vote_yellow' => VoteColor::Yellow,
        'vote_red' => VoteColor::Red,
    ];

    /** Respuestas escritas a mano que también cuentan como voto. */
    private const WORDS = [
        'verde' => VoteColor::Green, '1' => VoteColor::Green, 'volamos' => VoteColor::Green,
        'amarillo' => VoteColor::Yellow, '2' => VoteColor::Yellow, 'en espera' => VoteColor::Yellow, 'espera' => VoteColor::Yellow,
        'rojo' => VoteColor::Red, '3' => VoteColor::Red, 'se cancela' => VoteColor::Red, 'cancela' => VoteColor::Red,
    ];

    public function __invoke(Request $request, CastVote $castVote): Response
    {
        $user = User::findByWhatsApp((string) $request->input('From'));

        if (! $user) {
            return $this->reply('Este número no está registrado en la plataforma de FEGAT. Pide al administrador que lo agregue a tu usuario.');
        }

        if (! $user->canVote()) {
            return $this->reply('Tu usuario no puede votar. Solo votan los administradores de empresas asociadas activas.');
        }

        $color = $this->color($request->input('ButtonPayload'), $request->input('Body'));

        if (! $color) {
            return $this->reply('Para votar responde *Verde* (volamos), *Amarillo* (en espera) o *Rojo* (se cancela). También puedes responder 1, 2 o 3.');
        }

        try {
            $result = $castVote->handle($user, $color, 'whatsapp');
        } catch (VotingClosedException $exception) {
            return $this->reply("La votación está cerrada (horario: {$exception->opensAt} a {$exception->closesAt} h). No se registró tu voto.");
        }

        $date = CarbonImmutable::parse($result['flight_date'])->translatedFormat('l j \d\e F');
        $vote = "*{$color->label()} · {$color->meaning()}*";

        return $this->reply($result['changed']
            ? "✅ Voto registrado para {$user->company->name}: {$vote}, jornada del {$date}. Si cambias de opinión, responde otro color mientras la votación siga abierta."
            : "Tu voto para {$user->company->name} ya era {$vote}. No hubo cambios.");
    }

    private function color(?string $payload, ?string $body): ?VoteColor
    {
        if ($payload && isset(self::BUTTONS[$payload])) {
            return self::BUTTONS[$payload];
        }

        // Sin acentos, emojis ni signos: «¡Rojo!» o «🔴 rojo» cuentan igual.
        $text = trim(preg_replace('/[^a-z0-9 ]+/', '', Str::lower(Str::ascii((string) $body))) ?? '');
        $text = preg_replace('/\s+/', ' ', $text) ?? '';

        return self::WORDS[$text] ?? null;
    }

    private function reply(string $message): Response
    {
        $twiml = new MessagingResponse;
        $twiml->message($message);

        return response((string) $twiml, 200, ['Content-Type' => 'text/xml']);
    }
}
