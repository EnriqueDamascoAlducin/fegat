<?php

namespace App\Support;

/**
 * Contenido de una página del constructor por bloques: tema visual, bloques y SEO.
 * Todo lo que llega del editor pasa por sanitize() antes de guardarse o previsualizarse,
 * así el sitio público puede pintar el HTML de los campos con formato sin escaparlo.
 */
final class PageContent
{
    public const BLOCK_TYPES = [
        'hero', 'rich_text', 'image', 'image_cards', 'image_features', 'gallery', 'stats', 'why_us',
        'process', 'testimonials', 'cta', 'faqs', 'semaphore', 'weather', 'associates', 'posts', 'contact',
    ];

    public const MAX_BLOCKS = 80;

    /** Campos que el editor llena con el editor de texto con formato. */
    private const RICH_FIELDS = ['title', 'subtitle', 'description', 'body'];

    /** Campos con una dirección de imagen o video. */
    private const MEDIA_FIELDS = ['image', 'image_mobile', 'avatar'];

    /** Campos con el destino de un botón. */
    private const LINK_FIELDS = ['primary_url', 'secondary_url'];

    /** HTML libre del bloque: solo lo escribe el super admin y se pinta tal cual. */
    private const RAW_FIELDS = ['custom_html'];

    /** Listas de elementos dentro de un bloque. */
    private const LIST_FIELDS = ['items', 'images', 'steps'];

    private const SEO_FIELDS = ['meta_title', 'meta_description', 'og_title', 'og_description', 'og_image'];

    /**
     * @return array{primary: string, secondary: string, accent: string, background: string, text: string, radius: int, shadow: bool, variant: int}
     */
    public static function defaultTheme(): array
    {
        return [
            'primary' => '#6c0ea3',
            'secondary' => '#c699e1',
            'accent' => '#ead7f6',
            'background' => '#f3f5fa',
            'text' => '#444444',
            'radius' => 12,
            'shadow' => true,
            'variant' => 6,
        ];
    }

    /**
     * @return array{theme: array<string, mixed>, blocks: list<array<string, mixed>>, seo: array<string, string>}
     */
    public static function empty(): array
    {
        return ['theme' => self::defaultTheme(), 'blocks' => [], 'seo' => self::seo([])];
    }

    /**
     * @param  array<string, mixed>  $content
     * @return array{theme: array<string, mixed>, blocks: list<array<string, mixed>>, seo: array<string, string>}
     */
    public static function sanitize(array $content): array
    {
        $blocks = [];

        foreach (array_slice(is_array($content['blocks'] ?? null) ? $content['blocks'] : [], 0, self::MAX_BLOCKS) as $block) {
            if (is_array($block) && in_array($block['type'] ?? null, self::BLOCK_TYPES, true)) {
                $blocks[] = [
                    'id' => self::id($block['id'] ?? null, $block['type']),
                    'type' => $block['type'],
                    'enabled' => ($block['enabled'] ?? true) !== false,
                    'settings' => self::settings(is_array($block['settings'] ?? null) ? $block['settings'] : []),
                ];
            }
        }

        return [
            'theme' => self::theme(is_array($content['theme'] ?? null) ? $content['theme'] : []),
            'blocks' => $blocks,
            'seo' => self::seo(is_array($content['seo'] ?? null) ? $content['seo'] : []),
        ];
    }

    /**
     * Enlace seguro para un botón: rutas del sitio, anclas, https, correo o teléfono.
     */
    public static function safeLink(mixed $value): string
    {
        $url = trim((string) (is_scalar($value) ? $value : ''));

        return preg_match('~^(/(?!/)|#|https?://|mailto:|tel:)~i', $url) ? mb_substr($url, 0, 1000) : '';
    }

    /**
     * Imagen subida al sitio o publicada por https.
     */
    public static function safeMedia(mixed $value): string
    {
        $url = trim((string) (is_scalar($value) ? $value : ''));

        return preg_match('~^(/storage/|/images/|https://)~i', $url) && ! str_contains($url, '..') ? mb_substr($url, 0, 1000) : '';
    }

    /**
     * @param  array<string, mixed>  $theme
     * @return array<string, mixed>
     */
    private static function theme(array $theme): array
    {
        $defaults = self::defaultTheme();
        $color = fn (string $key) => is_string($theme[$key] ?? null) && preg_match('/^#[0-9a-f]{6}$/i', $theme[$key])
            ? strtolower($theme[$key])
            : $defaults[$key];

        return [
            'primary' => $color('primary'),
            'secondary' => $color('secondary'),
            'accent' => $color('accent'),
            'background' => $color('background'),
            'text' => $color('text'),
            'radius' => max(0, min(40, (int) ($theme['radius'] ?? $defaults['radius']))),
            'shadow' => ($theme['shadow'] ?? true) !== false,
            'variant' => max(1, min(6, (int) ($theme['variant'] ?? $defaults['variant']))),
        ];
    }

    /**
     * @param  array<string, mixed>  $seo
     * @return array<string, string>
     */
    private static function seo(array $seo): array
    {
        $clean = [];

        foreach (self::SEO_FIELDS as $field) {
            $value = $seo[$field] ?? '';
            $clean[$field] = $field === 'og_image'
                ? self::safeMedia($value)
                : mb_substr(trim(strip_tags((string) (is_scalar($value) ? $value : ''))), 0, 300);
        }

        return $clean;
    }

    /**
     * @param  array<array-key, mixed>  $settings
     * @return array<string, mixed>
     */
    private static function settings(array $settings, int $depth = 0): array
    {
        $clean = [];

        foreach ($settings as $key => $value) {
            if (! is_string($key) || ! preg_match('/^[a-z][a-z0-9_]{0,40}$/', $key)) {
                continue;
            }

            $clean[$key] = match (true) {
                in_array($key, self::LIST_FIELDS, true) && $depth === 0 => self::items($value),
                in_array($key, self::RICH_FIELDS, true) && $depth === 0 => RichText::sanitize(is_string($value) ? $value : ''),
                in_array($key, self::MEDIA_FIELDS, true) => self::safeMedia($value),
                in_array($key, self::LINK_FIELDS, true) => self::safeLink($value),
                in_array($key, self::RAW_FIELDS, true) && $depth === 0 => is_string($value) ? mb_substr($value, 0, 20000) : '',
                is_bool($value), is_int($value), is_float($value), $value === null => $value,
                // Texto plano: el sitio lo pinta escapado.
                is_string($value) => mb_substr($value, 0, 5000),
                default => null,
            };
        }

        return $clean;
    }

    /**
     * Elementos de una lista (tarjetas, fotos, pasos...): campos simples con las mismas reglas.
     *
     * @return list<array<string, mixed>>
     */
    private static function items(mixed $items): array
    {
        if (! is_array($items)) {
            return [];
        }

        return array_values(array_map(
            fn (array $item) => self::settings($item, 1),
            array_filter(array_slice($items, 0, 60), 'is_array'),
        ));
    }

    private static function id(mixed $id, string $type): string
    {
        return is_string($id) && preg_match('/^[A-Za-z0-9_-]{1,80}$/', $id) ? $id : $type.'-'.bin2hex(random_bytes(4));
    }
}
