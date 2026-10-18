<?php

namespace App\Support;

use App\Models\HomeContent;
use Illuminate\Support\Facades\Cache;

/**
 * Header y footer del sitio público, configurables desde el panel (igual que en sav_3).
 * Se comparten con todas las páginas públicas desde caché; se limpia al guardar cambios.
 */
final class SiteLayout
{
    private const CACHE_KEY = 'site-layout';

    private const ICONS = ['ArrowRight', 'Calendar', 'Clock', 'Gift', 'Heart', 'Mail', 'MapPin', 'MessageCircle', 'Phone', 'Star', 'Zap'];

    /**
     * @return array<string, mixed>
     */
    public static function defaultHeader(): array
    {
        return [
            'logo' => '',
            'logo_position' => 'left',
            'logo_size' => 44,
            'sticky' => true,
            'transparent_home' => false,
            'background_color' => '#6c0ea3',
            'text_color' => '#ffffff',
            'show_ticker' => true,
            'show_access_button' => true,
            'nav_items' => [],
            'cta' => [
                'enabled' => false,
                'label' => '',
                'url' => '',
                'link_type' => 'custom',
                'ref_id' => null,
                'open_in_new_tab' => false,
                'content_type' => 'text',
                'icon' => '',
            ],
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public static function defaultFooter(): array
    {
        return [
            'background_color' => '#2b0645',
            'text_color' => '#ffffff',
            'description' => 'Representación, desarrollo y liderazgo para el sector aerostático nacional.',
            'copyright' => '',
            'show_socials' => true,
            'show_contact' => true,
            'columns' => [],
        ];
    }

    /**
     * Header guardado, completo con los valores por defecto.
     *
     * @return array<string, mixed>
     */
    public static function header(): array
    {
        return self::cleanHeader(HomeContent::current()->header ?? []);
    }

    /**
     * @return array<string, mixed>
     */
    public static function footer(): array
    {
        return self::cleanFooter(HomeContent::current()->footer ?? []);
    }

    /**
     * Datos que recibe el layout público, con los enlaces ya resueltos y solo lo visible.
     *
     * @return array<string, mixed>
     */
    public static function shared(): array
    {
        return Cache::rememberForever(self::CACHE_KEY, function () {
            $links = new SiteLinks;
            $resolve = fn (array $link) => ['url' => $links->url($link['link_type'], $link['ref_id'], $link['url'])] + $link;

            $header = self::header();
            $header['nav_items'] = array_values(array_map(
                fn (array $item) => [...$resolve($item), 'children' => array_map($resolve, $item['children'])],
                array_filter($header['nav_items'], fn (array $item) => $item['visible']),
            ));
            $header['cta'] = $resolve($header['cta']);

            $footer = self::footer();
            $footer['columns'] = array_map(
                fn (array $column) => [...$column, 'links' => array_map($resolve, $column['links'])],
                $footer['columns'],
            );

            $content = HomeContent::current();

            return [
                'header' => $header,
                'footer' => $footer,
                'socials' => [
                    'facebook' => $content->facebook_url,
                    'instagram' => $content->instagram_url,
                    'tiktok' => $content->tiktok_url,
                    'youtube' => $content->youtube_url,
                ],
                'contact' => [
                    'email' => $content->contact_email,
                    'phones' => $content->contact_phones,
                ],
            ];
        });
    }

    public static function forget(): void
    {
        Cache::forget(self::CACHE_KEY);
    }

    /**
     * @param  array<string, mixed>  $data
     * @return array<string, mixed>
     */
    public static function cleanHeader(array $data): array
    {
        $defaults = self::defaultHeader();
        $cta = is_array($data['cta'] ?? null) ? $data['cta'] : [];

        return [
            'logo' => PageContent::safeMedia($data['logo'] ?? ''),
            'logo_position' => ($data['logo_position'] ?? null) === 'center' ? 'center' : 'left',
            'logo_size' => max(28, min(60, (int) ($data['logo_size'] ?? $defaults['logo_size']))),
            'sticky' => (bool) ($data['sticky'] ?? $defaults['sticky']),
            'transparent_home' => (bool) ($data['transparent_home'] ?? false),
            'background_color' => self::color($data['background_color'] ?? null, $defaults['background_color']),
            'text_color' => self::color($data['text_color'] ?? null, $defaults['text_color']),
            'show_ticker' => (bool) ($data['show_ticker'] ?? true),
            'show_access_button' => (bool) ($data['show_access_button'] ?? true),
            'nav_items' => array_map(fn (array $item) => [
                'id' => self::id($item['id'] ?? null),
                ...SiteLinks::clean($item),
                'visible' => ($item['visible'] ?? true) !== false,
                'children' => array_map(
                    fn (array $child) => ['id' => self::id($child['id'] ?? null), ...SiteLinks::clean($child)],
                    self::list($item['children'] ?? [], 20),
                ),
            ], self::list($data['nav_items'] ?? [], 20)),
            'cta' => [
                'enabled' => (bool) ($cta['enabled'] ?? false),
                ...SiteLinks::clean($cta),
                'content_type' => ($cta['content_type'] ?? null) === 'icon' ? 'icon' : 'text',
                'icon' => in_array($cta['icon'] ?? null, self::ICONS, true) ? $cta['icon'] : '',
            ],
        ];
    }

    /**
     * @param  array<string, mixed>  $data
     * @return array<string, mixed>
     */
    public static function cleanFooter(array $data): array
    {
        $defaults = self::defaultFooter();
        $text = fn (string $key, int $max) => mb_substr(trim((string) (is_scalar($data[$key] ?? null) ? $data[$key] : $defaults[$key])), 0, $max);

        return [
            'background_color' => self::color($data['background_color'] ?? null, $defaults['background_color']),
            'text_color' => self::color($data['text_color'] ?? null, $defaults['text_color']),
            'description' => $text('description', 500),
            'copyright' => $text('copyright', 255),
            'show_socials' => (bool) ($data['show_socials'] ?? true),
            'show_contact' => (bool) ($data['show_contact'] ?? true),
            'columns' => array_map(fn (array $column) => [
                'id' => self::id($column['id'] ?? null),
                'title' => mb_substr(trim((string) (is_scalar($column['title'] ?? null) ? $column['title'] : '')), 0, 80),
                'links' => array_map(
                    fn (array $link) => ['id' => self::id($link['id'] ?? null), ...SiteLinks::clean($link)],
                    self::list($column['links'] ?? [], 20),
                ),
            ], self::list($data['columns'] ?? [], 6)),
        ];
    }

    /**
     * @return list<array<string, mixed>>
     */
    private static function list(mixed $value, int $max): array
    {
        return is_array($value) ? array_values(array_filter(array_slice($value, 0, $max), 'is_array')) : [];
    }

    private static function color(mixed $value, string $fallback): string
    {
        return is_string($value) && preg_match('/^#[0-9a-f]{6}$/i', $value) ? strtolower($value) : $fallback;
    }

    private static function id(mixed $id): string
    {
        return is_string($id) && preg_match('/^[A-Za-z0-9_-]{1,40}$/', $id) ? $id : bin2hex(random_bytes(4));
    }
}
