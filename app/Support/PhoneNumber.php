<?php

namespace App\Support;

/**
 * Teléfonos en formato E.164 (+5255…), que es como Twilio identifica al
 * remitente de un WhatsApp.
 */
final class PhoneNumber
{
    /**
     * Acepta «55 1234 5678», «+52 55 1234 5678» o «whatsapp:+5215512345678».
     * Diez dígitos se toman como número de México. WhatsApp a veces reporta
     * los celulares mexicanos con el antiguo «1» (+521…); se quita para que
     * el mismo número siempre se guarde y se busque igual.
     */
    public static function normalize(?string $value): ?string
    {
        $digits = preg_replace('/\D/', '', str_replace('whatsapp:', '', (string) $value)) ?? '';

        if (strlen($digits) === 10) {
            $digits = '52'.$digits;
        }

        if (strlen($digits) === 13 && str_starts_with($digits, '521')) {
            $digits = '52'.substr($digits, 3);
        }

        return strlen($digits) >= 11 && strlen($digits) <= 15 ? '+'.$digits : null;
    }
}
