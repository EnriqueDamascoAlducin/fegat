<?php

namespace App\Models;

use App\Support\SiteLayout;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;

/**
 * Configuración general del sitio público (un solo registro): header, footer, datos de
 * contacto y redes. La portada y los textos de cada página viven en App\Models\Page.
 *
 * Las columnas hero_*, semaphore_text y contact_text son del inicio anterior; su contenido
 * se pasó a los bloques de la página de inicio y ya no se editan.
 *
 * @property array<string, mixed>|null $header
 * @property array<string, mixed>|null $footer
 * @property array<string, mixed>|null $blog Configuración del blog (ver App\Support\BlogSettings).
 * @property string|null $contact_email
 * @property string|null $contact_phones
 * @property string|null $contact_hours
 * @property string|null $contact_address
 * @property string|null $map_url Enlace a Google Maps de la oficina.
 * @property string|null $facebook_url
 * @property string|null $instagram_url
 * @property string|null $tiktok_url
 * @property string|null $youtube_url
 */
#[Fillable([
    'header', 'footer', 'blog',
    'contact_email', 'contact_phones', 'contact_hours', 'contact_address', 'map_url',
    'facebook_url', 'instagram_url', 'tiktok_url', 'youtube_url',
])]
class HomeContent extends Model
{
    /**
     * Datos de contacto y redes sociales que muestran el bloque «Contacto» y el footer.
     */
    public const CONTACT_FIELDS = [
        'contact_email', 'contact_phones', 'contact_hours', 'contact_address', 'map_url',
        'facebook_url', 'instagram_url', 'tiktok_url', 'youtube_url',
    ];

    /**
     * @var array<string, mixed>
     */
    protected $attributes = [
        'hero_title' => 'Federación de Globos Aerostáticos Teotihuacán A.C.',
        'semaphore_text' => '',
        'contact_text' => '',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'header' => 'array',
            'footer' => 'array',
            'blog' => 'array',
        ];
    }

    protected static function booted(): void
    {
        static::saved(fn () => SiteLayout::forget());
    }

    /**
     * La configuración es un único registro.
     */
    public static function current(): self
    {
        return static::query()->first() ?? static::query()->create();
    }
}
