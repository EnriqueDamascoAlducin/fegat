<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;
use Twilio\Security\RequestValidator;

/**
 * Solo acepta peticiones firmadas por Twilio con nuestro Auth Token; así nadie
 * más puede registrar votos haciéndose pasar por un número de WhatsApp.
 */
class VerifyTwilioSignature
{
    /**
     * @param  Closure(Request): (Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        $token = config('services.twilio.token');
        // La firma se calcula sobre la URL exacta configurada en Twilio.
        $url = config('services.twilio.webhook_url') ?: $request->fullUrl();

        $valid = filled($token) && (new RequestValidator($token))->validate(
            (string) $request->header('X-Twilio-Signature'),
            $url,
            $request->post(),
        );

        abort_unless($valid, 403);

        return $next($request);
    }
}
