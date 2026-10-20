<?php

namespace App\Support\WhatsApp;

use App\Contracts\WhatsAppSender;
use Carbon\CarbonImmutable;
use RuntimeException;

/**
 * Recordatorio y encuesta de votación. Lo usan el envío automático y la prueba
 * del super admin, para que la prueba llegue exactamente igual que el real.
 */
class VotingMessages
{
    public function __construct(private WhatsAppSender $whatsApp) {}

    /**
     * Twilio con sus credenciales y las dos plantillas.
     */
    public static function isReady(): bool
    {
        return TwilioWhatsApp::isConfigured()
            && filled(config('services.twilio.template_vote_reminder'))
            && filled(config('services.twilio.template_vote_poll'));
    }

    /**
     * @param  array{flight_date: string, closes_at: string}  $session
     *
     * @throws RuntimeException si Twilio no está listo o rechaza el envío.
     */
    public function send(string $toE164, string $name, string $company, array $session): void
    {
        if (! self::isReady()) {
            throw new RuntimeException('Falta configurar Twilio o sus plantillas en el .env del servidor.');
        }

        $date = CarbonImmutable::parse($session['flight_date'])->translatedFormat('l j \d\e F');

        $this->whatsApp->sendTemplate($toE164, config('services.twilio.template_vote_reminder'), [
            '1' => $name,
            '2' => $date,
            '3' => $company,
            '4' => $session['closes_at'],
            '5' => route('dashboard'),
        ]);

        $this->whatsApp->sendTemplate($toE164, config('services.twilio.template_vote_poll'), [
            '1' => $company,
            '2' => $date,
        ]);
    }
}
