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
 * @property-read string|null $hero_image_url
 */
#[Fillable(['hero_title', 'hero_text', 'hero_image_path', 'semaphore_text', 'contact_text'])]
class HomeContent extends Model
{
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
