<?php

namespace App\Support\WhatsApp;

use App\Contracts\WhatsAppSender;
use Illuminate\Support\Facades\Log;
use RuntimeException;
use Twilio\Http\CurlClient;
use Twilio\Rest\Client;

/**
 * Envío de WhatsApp con Twilio, igual que en SAV. El cliente se crea hasta el
 * primer envío para que la aplicación funcione aunque Twilio no esté configurado.
 */
class TwilioWhatsApp implements WhatsAppSender
{
    private ?Client $client = null;

    public static function isConfigured(): bool
    {
        return filled(config('services.twilio.sid'))
            && filled(config('services.twilio.token'))
            && filled(config('services.twilio.whatsapp_from'));
    }

    public function sendTemplate(string $toE164, string $contentSid, array $variables = []): string
    {
        $payload = [
            'from' => config('services.twilio.whatsapp_from'),
            'contentSid' => $contentSid,
        ];

        if ($variables) {
            $payload['contentVariables'] = json_encode($variables, JSON_UNESCAPED_UNICODE);
        }

        $message = $this->client()->messages->create("whatsapp:{$toE164}", $payload);

        // create() solo confirma que Twilio aceptó el mensaje; los rechazos de
        // WhatsApp llegan después. El SID permite rastrearlos en Monitor → Logs.
        Log::info('WhatsApp encolado en Twilio', [
            'to' => $toE164,
            'template' => $contentSid,
            'sid' => $message->sid,
            'status' => $message->status,
        ]);

        return (string) $message->sid;
    }

    private function client(): Client
    {
        if ($this->client) {
            return $this->client;
        }

        if (! self::isConfigured()) {
            throw new RuntimeException('Twilio WhatsApp no está configurado. Revisa TWILIO_* en el .env.');
        }

        $curlOptions = [];

        if (! filter_var(config('services.twilio.ssl_verify', true), FILTER_VALIDATE_BOOLEAN)) {
            $curlOptions[CURLOPT_SSL_VERIFYPEER] = false;
            $curlOptions[CURLOPT_SSL_VERIFYHOST] = 0;
        }

        return $this->client = new Client(
            config('services.twilio.sid'),
            config('services.twilio.token'),
            null,
            null,
            new CurlClient($curlOptions),
        );
    }
}
