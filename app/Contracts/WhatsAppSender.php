<?php

namespace App\Contracts;

interface WhatsAppSender
{
    /**
     * Plantilla aprobada por Meta (Content SID «HX…»). Es la única forma de
     * escribirle primero a alguien por WhatsApp.
     *
     * @param  array<int|string, string>  $variables  Posicionales: ['1' => …, '2' => …]
     * @return string SID del mensaje en Twilio.
     */
    public function sendTemplate(string $toE164, string $contentSid, array $variables = []): string;
}
