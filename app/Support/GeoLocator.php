<?php

namespace App\Support;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Throwable;

/**
 * País del visitante (ISO-3166-1 alpha-2), port del GeoLocator de sav_3:
 *   1. Encabezado CF-IPCountry de Cloudflare: gratis y sin consultas.
 *   2. ipwho.is por IP, en caché 30 días (si live_visitors.geo_lookup está activo).
 * Devuelve null si no se puede saber (IP privada, error del servicio…).
 */
final class GeoLocator
{
    public function country(Request $request): ?string
    {
        $cloudflare = strtoupper((string) $request->header('CF-IPCountry'));

        if ($this->isValidCountry($cloudflare)) {
            return $cloudflare;
        }

        $ip = $request->ip();

        if (! config('live_visitors.geo_lookup') || ! $this->isPublicIp($ip)) {
            return null;
        }

        return Cache::remember('geo:country:'.sha1((string) $ip), now()->addDays(30), fn (): ?string => $this->lookup((string) $ip));
    }

    private function lookup(string $ip): ?string
    {
        try {
            $response = Http::timeout(3)->get("https://ipwho.is/{$ip}", ['fields' => 'success,country_code']);
        } catch (Throwable) {
            return null;
        }

        if (! $response->ok() || $response->json('success') === false) {
            return null;
        }

        $code = strtoupper((string) $response->json('country_code'));

        return $this->isValidCountry($code) ? $code : null;
    }

    private function isValidCountry(string $code): bool
    {
        return $code !== 'XX' && preg_match('/^[A-Z]{2}$/', $code) === 1;
    }

    private function isPublicIp(?string $ip): bool
    {
        return is_string($ip) && filter_var($ip, FILTER_VALIDATE_IP, FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE) !== false;
    }
}
