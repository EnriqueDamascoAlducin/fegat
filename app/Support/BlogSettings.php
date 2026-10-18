<?php

namespace App\Support;

use App\Models\HomeContent;

/**
 * Configuración del blog público (port de BlogSettingsController::config de sav_3).
 */
final class BlogSettings
{
    /**
     * @return array<string, mixed>
     */
    public static function defaults(): array
    {
        return [
            'enabled' => true,
            'title' => 'Blog',
            'subtitle' => 'Noticias, eventos y artículos de la Federación de Globos Aerostáticos Teotihuacán.',
            'hero_image' => '',
            'posts_per_page' => 12,
            'show_featured' => true,
            'related_count' => 3,
            'cta' => [
                'enabled' => false,
                'title' => '¿Quieres apoyar a la federación?',
                'label' => 'Conoce cómo',
                'url' => '',
                'link_type' => 'custom',
                'ref_id' => null,
                'open_in_new_tab' => false,
            ],
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public static function get(): array
    {
        return self::clean(HomeContent::current()->blog ?? []);
    }

    /**
     * @param  array<string, mixed>  $data
     * @return array<string, mixed>
     */
    public static function clean(array $data): array
    {
        $defaults = self::defaults();
        $cta = is_array($data['cta'] ?? null) ? $data['cta'] : [];
        $text = fn (mixed $value, string $fallback, int $max) => mb_substr(trim((string) (is_scalar($value) ? $value : $fallback)), 0, $max);

        return [
            'enabled' => (bool) ($data['enabled'] ?? true),
            'title' => $text($data['title'] ?? null, $defaults['title'], 255) ?: $defaults['title'],
            'subtitle' => $text($data['subtitle'] ?? null, $defaults['subtitle'], 1000),
            'hero_image' => PageContent::safeMedia($data['hero_image'] ?? ''),
            'posts_per_page' => max(3, min(48, (int) ($data['posts_per_page'] ?? $defaults['posts_per_page']))),
            'show_featured' => (bool) ($data['show_featured'] ?? true),
            'related_count' => max(0, min(6, (int) ($data['related_count'] ?? $defaults['related_count']))),
            'cta' => [
                ...SiteLinks::clean($cta),
                'enabled' => (bool) ($cta['enabled'] ?? false),
                'title' => $text($cta['title'] ?? null, $defaults['cta']['title'], 255),
                'label' => $text($cta['label'] ?? null, $defaults['cta']['label'], 100),
            ],
        ];
    }
}
