<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Model;

/**
 * Textos fijos de la página pública que el super admin puede editar.
 *
 * @property string $hero_title
 * @property string|null $hero_text
 * @property string|null $hero_image_path
 * @property string $semaphore_text
 * @property string $contact_text
 * @property string|null $contact_email
 * @property string|null $contact_phones
 * @property string|null $contact_hours
 * @property string|null $contact_address
 * @property string|null $map_url Enlace a Google Maps de la oficina.
 * @property string|null $facebook_url
 * @property string|null $instagram_url
 * @property string|null $tiktok_url
 * @property string|null $youtube_url
 * @property-read string|null $hero_image_url
 */
#[Fillable([
    'hero_title', 'hero_text', 'hero_image_path', 'semaphore_text', 'contact_text',
    'contact_email', 'contact_phones', 'contact_hours', 'contact_address', 'map_url',
    'facebook_url', 'instagram_url', 'tiktok_url', 'youtube_url',
])]
class HomeContent extends Model
{
    /**
     * Datos de contacto y redes sociales que se muestran en la página «Contacto».
     */
    public const CONTACT_FIELDS = [
        'contact_email', 'contact_phones', 'contact_hours', 'contact_address', 'map_url',
        'facebook_url', 'instagram_url', 'tiktok_url', 'youtube_url',
    ];

    /**
     * @var array<string, mixed>
     */
    protected $attributes = [
        'hero_title' => 'Federación de Globos Aerostáticos Teotihuacan A.C',
        'semaphore_text' => 'Las empresas asociadas evalúan las condiciones de cada jornada y deciden en conjunto si es viable volar.',
        'contact_text' => 'Contáctanos para cualquier duda y/o aclaración.',
    ];

    /**
     * @return Attribute<string|null, never>
     */
    protected function heroImageUrl(): Attribute
    {
        return Attribute::get(fn () => $this->hero_image_path ? '/storage/'.$this->hero_image_path : null);
    }

    /**
     * El contenido es un único registro; se crea con los textos originales.
     */
    public static function current(): self
    {
        return static::query()->first() ?? static::query()->create();
    }
}
