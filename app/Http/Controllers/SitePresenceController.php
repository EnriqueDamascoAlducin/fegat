<?php

namespace App\Http\Controllers;

use App\Support\GeoLocator;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

/**
 * Latido de presencia del sitio público (port de StorePresenceController de sav_3).
 * Corre sin sesión, cookies ni Inertia (ver routes/web.php) y hace una sola consulta
 * (dos al cambiar de página): se llama cada ~30 s por visitante, así que todo lo que
 * se agregue aquí se paga multiplicado.
 */
class SitePresenceController extends Controller
{
    /** Navegadores embebidos de apps: el primero que coincida gana. */
    private const IN_APP = [
        'Instagram' => '/instagram/',
        'Messenger' => '/messengerforios|orca-android|fb_iab\/messenger/',
        'Facebook' => '/fban|fbav|fb_iab/',
        'TikTok' => '/tiktok|musical_ly|bytedancewebview/',
        'Pinterest' => '/pinterest/',
        'Snapchat' => '/snapchat/',
        'LinkedIn' => '/linkedinapp/',
        'X' => '/twitter/',
        'Google app' => '/\bgsa\//',
    ];

    private const BROWSERS = [
        'Edge' => '/edg(e|a|ios)?\//',
        'Opera' => '/opr\/|opera/',
        'Samsung Internet' => '/samsungbrowser/',
        'Firefox' => '/firefox|fxios/',
        'Chrome' => '/chrome|crios/',
        'Safari' => '/version\/.*safari/',
    ];

    private const SYSTEMS = [
        'iOS' => '/iphone|ipad|ipod/',
        'Android' => '/android/',
        'Windows' => '/windows/',
        'macOS' => '/macintosh|mac os x/',
        'ChromeOS' => '/cros/',
        'Linux' => '/linux/',
    ];

    public function __invoke(Request $request, GeoLocator $geo): Response
    {
        if (! config('live_visitors.enabled') || $this->isBot($request)) {
            return response()->noContent();
        }

        // Sin sesión no hay a dónde redirigir un error: un latido mal formado se descarta.
        $validator = validator($request->all(), [
            'token' => ['required', 'uuid'],
            'path' => ['required', 'string', 'max:2000'],
            'title' => ['nullable', 'string', 'max:500'],
            'device_type' => ['nullable', 'in:mobile,tablet,desktop'],
            'screen_width' => ['nullable', 'integer', 'min:0', 'max:20000'],
            'navigated' => ['nullable', 'boolean'],
            'new_visit' => ['nullable', 'boolean'],
            'referrer_host' => ['nullable', 'string', 'max:255'],
            'utm_source' => ['nullable', 'string', 'max:255'],
            'utm_medium' => ['nullable', 'string', 'max:255'],
            'utm_campaign' => ['nullable', 'string', 'max:255'],
            'paid_click' => ['nullable', 'in:google,meta,tiktok,microsoft'],
        ]);

        if ($validator->fails()) {
            return response()->noContent(422);
        }

        $data = $validator->validated();
        $now = now();
        $path = $this->cleanPath($data['path']);
        $userAgent = strtolower((string) $request->userAgent());
        $newVisit = (bool) ($data['new_visit'] ?? false);

        $row = [
            'visitor_token' => $data['token'],
            'ip_hash' => hash_hmac('sha256', (string) $request->ip(), (string) config('app.key')),
            // El país se busca una vez por visita: los latidos de «sigo aquí» no consultan nada.
            'country_code' => $newVisit ? $geo->country($request) : null,
            'device_type' => $data['device_type'] ?? null,
            'os' => $this->match(self::SYSTEMS, $userAgent),
            'browser' => $this->match(self::BROWSERS, $userAgent),
            'in_app' => $this->match(self::IN_APP, $userAgent, null),
            'screen_width' => $data['screen_width'] ?? null,
            'path' => $path,
            'page_title' => isset($data['title']) ? Str::limit($data['title'], 250, '') : null,
            'landing_path' => $path,
            'referrer_host' => $data['referrer_host'] ?? null,
            'utm_source' => $data['utm_source'] ?? null,
            'utm_medium' => $data['utm_medium'] ?? null,
            'utm_campaign' => $data['utm_campaign'] ?? null,
            'paid_click' => $data['paid_click'] ?? null,
            'page_views' => 1,
            'first_seen_at' => $now,
            'last_seen_at' => $now,
        ];

        // Si la fila ya existe solo se mueve lo que cambia entre latidos.
        $update = ['ip_hash', 'device_type', 'os', 'browser', 'in_app', 'screen_width', 'path', 'page_title', 'last_seen_at'];

        if ($row['country_code'] !== null) {
            $update[] = 'country_code';
        }

        if ($newVisit) {
            // Mismo navegador que vuelve tras un rato: la visita empieza de cero.
            array_push($update, 'landing_path', 'referrer_host', 'utm_source', 'utm_medium', 'utm_campaign', 'paid_click', 'page_views', 'first_seen_at');
        } elseif ($data['navigated'] ?? false) {
            $update['page_views'] = DB::raw('page_views + 1');
        }

        DB::table('site_live_visitors')->upsert([$row], ['visitor_token'], $update);

        // Solo cuando cambió de página (o cargó una): los latidos de «sigo aquí» no agregan filas.
        if (($data['navigated'] ?? false) || $newVisit) {
            DB::table('site_page_views')->insert([
                'visitor_token' => $data['token'],
                'path' => $path,
                'title' => $row['page_title'],
                'viewed_at' => $now,
            ]);
        }

        return response()->noContent();
    }

    /**
     * Solo la ruta, sin query string (puede traer datos personales).
     */
    private function cleanPath(string $path): string
    {
        return Str::limit('/'.ltrim(Str::before(Str::before($path, '?'), '#'), '/'), 480, '');
    }

    /**
     * @param  array<string, string>  $patterns
     */
    private function match(array $patterns, string $userAgent, ?string $default = 'Otro'): ?string
    {
        foreach ($patterns as $name => $pattern) {
            if (preg_match($pattern, $userAgent)) {
                return $name;
            }
        }

        return $default;
    }

    private function isBot(Request $request): bool
    {
        $userAgent = strtolower((string) $request->userAgent());

        return $userAgent === ''
            || (bool) preg_match('/bot|crawl|spider|slurp|prerender|headless|lighthouse|pagespeed|facebookexternalhit|whatsapp|preview/', $userAgent);
    }
}
