<?php

namespace App\Http\Middleware;

use App\Models\ApiClient;
use Closure;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Autoriza a los sistemas externos de la API.
 *
 * Lo que de verdad protege es la llave (Authorization: Bearer fegat_…), que se manda
 * desde el servidor del cliente. La IP y el dominio son candados extra por llave: el
 * dominio (Origin) solo lo respeta un navegador, así que nunca basta por sí solo.
 */
class AuthenticateApiClient
{
    public const ATTRIBUTE = 'api_client';

    /**
     * @param  Closure(Request): (Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        $origin = $request->headers->get('Origin');

        // Preflight de CORS: el navegador pregunta antes de mandar la llave.
        if ($request->isMethod('OPTIONS')) {
            return $origin && $this->originAllowedByAnyClient($origin)
                ? $this->withCors(response()->noContent(), $origin)
                : $this->error('Este dominio no está autorizado.', 403);
        }

        $client = ApiClient::findByToken($request->bearerToken() ?: $request->header('X-Api-Key'));

        if (! $client || ! $client->is_active) {
            return $this->error('Llave de API inválida o desactivada.', 401);
        }

        if (! $client->allowsIp($request->ip())) {
            return $this->error('Esta IP no está autorizada para esta llave.', 403);
        }

        if ($origin !== null && ! $client->allowsOrigin($origin)) {
            return $this->error('Este dominio no está autorizado para esta llave.', 403);
        }

        // Un registro por minuto basta para saber si la llave se está usando.
        if (! $client->last_used_at || $client->last_used_at->lt(now()->subMinute())) {
            $client->forceFill(['last_used_at' => now(), 'last_used_ip' => $request->ip()])->saveQuietly();
        }

        $request->attributes->set(self::ATTRIBUTE, $client);

        $response = $next($request);

        return $origin !== null ? $this->withCors($response, $origin) : $response;
    }

    private function originAllowedByAnyClient(string $origin): bool
    {
        return ApiClient::query()->where('is_active', true)->get(['id', 'allowed_origins'])
            ->contains(fn (ApiClient $client) => $client->allowsOrigin($origin));
    }

    private function withCors(Response $response, string $origin): Response
    {
        $response->headers->set('Access-Control-Allow-Origin', (string) ApiClient::normalizeOrigin($origin));
        $response->headers->set('Access-Control-Allow-Methods', 'GET, OPTIONS');
        $response->headers->set('Access-Control-Allow-Headers', 'Authorization, X-Api-Key, Accept');
        $response->headers->set('Access-Control-Max-Age', '600');
        $response->headers->set('Vary', 'Origin');

        return $response;
    }

    private function error(string $message, int $status): JsonResponse
    {
        return response()->json(['message' => $message], $status);
    }
}
