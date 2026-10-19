<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Carbon;
use Illuminate\Support\Str;
use Symfony\Component\HttpFoundation\IpUtils;

/**
 * Sistema externo autorizado a consultar la API (por ejemplo sav_3).
 *
 * @property string $name
 * @property string $token_hash sha256 de la llave; la llave nunca se guarda.
 * @property string $token_prefix Inicio de la llave, para reconocerla en el panel.
 * @property list<string>|null $allowed_ips IPs o rangos CIDR; vacío = cualquier IP.
 * @property list<string>|null $allowed_origins Dominios que la pueden usar desde un navegador (CORS).
 * @property bool $is_active
 * @property Carbon|null $last_used_at
 * @property string|null $last_used_ip
 */
#[Fillable(['name', 'token_hash', 'token_prefix', 'allowed_ips', 'allowed_origins', 'is_active', 'last_used_at', 'last_used_ip'])]
#[Hidden(['token_hash'])]
class ApiClient extends Model
{
    public const TOKEN_PREFIX = 'fegat_';

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'allowed_ips' => 'array',
            'allowed_origins' => 'array',
            'is_active' => 'boolean',
            'last_used_at' => 'datetime',
        ];
    }

    public static function hash(string $token): string
    {
        return hash('sha256', $token);
    }

    /**
     * Crea una llave nueva y devuelve el texto completo, que solo se puede ver esta vez.
     */
    public function issueToken(): string
    {
        $token = self::TOKEN_PREFIX.Str::random(40);

        $this->forceFill([
            'token_hash' => self::hash($token),
            'token_prefix' => substr($token, 0, strlen(self::TOKEN_PREFIX) + 6),
        ])->save();

        return $token;
    }

    public static function findByToken(?string $token): ?self
    {
        if (! is_string($token) || ! str_starts_with($token, self::TOKEN_PREFIX)) {
            return null;
        }

        return static::query()->where('token_hash', self::hash($token))->first();
    }

    public function allowsIp(?string $ip): bool
    {
        $allowed = array_values(array_filter($this->allowed_ips ?? []));

        return $allowed === [] || ($ip !== null && IpUtils::checkIp($ip, $allowed));
    }

    public function allowsOrigin(string $origin): bool
    {
        return in_array(self::normalizeOrigin($origin), $this->allowed_origins ?? [], true);
    }

    /**
     * «https://Sav.Ejemplo.com/ruta» → «https://sav.ejemplo.com». null si no es un origen válido.
     */
    public static function normalizeOrigin(string $value): ?string
    {
        $parts = parse_url(trim($value));

        if (! isset($parts['scheme'], $parts['host']) || ! in_array($parts['scheme'], ['http', 'https'], true)) {
            return null;
        }

        return strtolower($parts['scheme'].'://'.$parts['host'].(isset($parts['port']) ? ':'.$parts['port'] : ''));
    }
}
