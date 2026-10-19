<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\ApiClient;
use Closure;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\IpUtils;

/**
 * Llaves de la API del semáforo para sistemas externos.
 */
class ApiClientController extends Controller
{
    public function index(): Response
    {
        return Inertia::render('admin/api-clients', [
            'clients' => ApiClient::query()->latest()->get()->map(fn (ApiClient $client) => [
                'id' => $client->id,
                'name' => $client->name,
                'token_prefix' => $client->token_prefix,
                'allowed_ips' => $client->allowed_ips ?? [],
                'allowed_origins' => $client->allowed_origins ?? [],
                'is_active' => $client->is_active,
                'last_used_at' => $client->last_used_at?->toIso8601String(),
                'last_used_ip' => $client->last_used_ip,
                'created_at' => $client->created_at?->toIso8601String(),
            ]),
            'endpoint' => route('api.semaphore'),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $client = new ApiClient([...$this->validated($request), 'is_active' => true]);
        $token = $client->issueToken();

        return $this->withToken($token, "Llave creada para «{$client->name}».");
    }

    public function update(Request $request, ApiClient $apiClient): RedirectResponse
    {
        $apiClient->update([...$this->validated($request), 'is_active' => $request->boolean('is_active')]);

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Llave actualizada.']);

        return back();
    }

    /**
     * Cambia la llave: la anterior deja de funcionar en ese momento.
     */
    public function regenerate(ApiClient $apiClient): RedirectResponse
    {
        return $this->withToken($apiClient->issueToken(), "Nueva llave para «{$apiClient->name}». La anterior ya no funciona.");
    }

    public function destroy(ApiClient $apiClient): RedirectResponse
    {
        $apiClient->delete();

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Llave eliminada.']);

        return back();
    }

    private function withToken(string $token, string $message): RedirectResponse
    {
        // La llave completa solo viaja en este aviso: no se puede volver a consultar.
        Inertia::flash('newToken', $token);
        Inertia::flash('toast', ['type' => 'success', 'message' => $message]);

        return back();
    }

    /**
     * @return array{name: string, allowed_ips: list<string>|null, allowed_origins: list<string>|null}
     */
    private function validated(Request $request): array
    {
        $ips = $this->lines($request->input('allowed_ips'));
        $origins = $this->lines($request->input('allowed_origins'));
        $request->merge(['allowed_ips' => $ips, 'allowed_origins' => $origins]);

        $request->validate([
            'name' => ['required', 'string', 'max:120'],
            'allowed_ips' => ['array', 'max:20'],
            'allowed_ips.*' => [fn (string $attribute, mixed $value, Closure $fail) => $this->validIp((string) $value)
                ? null
                : $fail("«{$value}» no es una IP ni un rango válido (ejemplo: 203.0.113.10 o 203.0.113.0/24).")],
            'allowed_origins' => ['array', 'max:20'],
            'allowed_origins.*' => [fn (string $attribute, mixed $value, Closure $fail) => ApiClient::normalizeOrigin((string) $value)
                ? null
                : $fail("«{$value}» no es un dominio válido (ejemplo: https://sav.ejemplo.com).")],
        ]);

        return [
            'name' => (string) $request->input('name'),
            'allowed_ips' => $ips ?: null,
            'allowed_origins' => $origins ? array_values(array_unique(array_map(fn (string $origin) => (string) ApiClient::normalizeOrigin($origin), $origins))) : null,
        ];
    }

    /**
     * Una por renglón (o separadas por comas), sin vacíos ni repetidas.
     *
     * @return list<string>
     */
    private function lines(mixed $value): array
    {
        $items = is_array($value) ? $value : preg_split('/[\s,]+/', (string) $value);

        return array_values(array_unique(array_filter(array_map(fn (mixed $item) => trim((string) $item), $items ?: []))));
    }

    private function validIp(string $value): bool
    {
        [$ip, $mask] = array_pad(explode('/', $value, 2), 2, null);

        if (filter_var($ip, FILTER_VALIDATE_IP) === false) {
            return false;
        }

        if ($mask === null) {
            return true;
        }

        $max = str_contains($ip, ':') ? 128 : 32;

        return ctype_digit($mask) && (int) $mask <= $max && IpUtils::checkIp($ip, $value);
    }
}
