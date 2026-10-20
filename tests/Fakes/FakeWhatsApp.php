<?php

namespace Tests\Fakes;

use App\Contracts\WhatsAppSender;
use RuntimeException;

/**
 * Sustituye a Twilio en las pruebas: guarda los mensajes en lugar de enviarlos.
 */
class FakeWhatsApp implements WhatsAppSender
{
    /** @var list<array{to: string, template: string, variables: array<int|string, string>}> */
    public array $sent = [];

    public bool $fail = false;

    public function sendTemplate(string $toE164, string $contentSid, array $variables = []): string
    {
        if ($this->fail) {
            throw new RuntimeException('Twilio no disponible');
        }

        $this->sent[] = ['to' => $toE164, 'template' => $contentSid, 'variables' => $variables];

        return 'SM'.count($this->sent);
    }
}
