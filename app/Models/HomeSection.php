<?php

namespace App\Models;

use App\Support\RichText;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Model;

/**
 * Sección informativa de la página pública (por ejemplo «¿Por qué elegirnos?»).
 *
 * @property string $title
 * @property string $body HTML del editor con formato, siempre saneado al guardar.
 * @property string|null $image_path
 * @property bool $is_visible
 * @property int $position
 * @property-read string|null $image_url
 */
#[Fillable(['title', 'body', 'image_path', 'is_visible', 'position'])]
class HomeSection extends Model
{
    /**
     * @var list<string>
     */
    protected $appends = ['image_url'];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'is_visible' => 'boolean',
            'position' => 'integer',
        ];
    }

    /**
     * @return Attribute<string, string>
     */
    protected function body(): Attribute
    {
        return Attribute::set(fn (?string $value) => RichText::sanitize($value));
    }

    /**
     * @return Attribute<string|null, never>
     */
    protected function imageUrl(): Attribute
    {
        return Attribute::get(fn () => $this->image_path ? '/storage/'.$this->image_path : null);
    }
}
