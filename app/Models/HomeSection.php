<?php

namespace App\Models;

use App\Enums\SitePage;
use App\Support\RichText;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Model;

/**
 * Sección informativa de una página pública (por ejemplo «Misión» en «Quiénes somos»).
 *
 * @property SitePage $page
 * @property string $title
 * @property string $body HTML del editor con formato, siempre saneado al guardar.
 * @property string|null $image_path
 * @property bool $is_visible
 * @property int $position
 * @property-read string|null $image_url
 */
#[Fillable(['page', 'title', 'body', 'image_path', 'is_visible', 'position'])]
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
            'page' => SitePage::class,
            'is_visible' => 'boolean',
            'position' => 'integer',
        ];
    }

    /**
     * Secciones visibles de una página, en el orden elegido por el admin.
     *
     * @param  Builder<self>  $query
     */
    public function scopePublishedOn(Builder $query, SitePage $page): void
    {
        $query->where('page', $page)->where('is_visible', true)->orderBy('position')->orderBy('id');
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
