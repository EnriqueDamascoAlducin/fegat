<?php

namespace App\Models;

use App\Support\SiteLayout;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * Categoría del blog, con su página de archivo en /blog/categoria/{slug}.
 *
 * @property string $name
 * @property string $slug
 * @property string|null $description
 * @property string|null $meta_title
 * @property string|null $meta_description
 * @property bool $is_active
 * @property int $sort_order
 */
#[Fillable(['name', 'slug', 'description', 'meta_title', 'meta_description', 'is_active', 'sort_order'])]
class BlogCategory extends Model
{
    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'is_active' => 'boolean',
            'sort_order' => 'integer',
        ];
    }

    protected static function booted(): void
    {
        // El menú y el footer pueden enlazar categorías por id.
        static::saved(fn () => SiteLayout::forget());
        static::deleted(fn () => SiteLayout::forget());
    }

    /**
     * @return HasMany<Post, $this>
     */
    public function posts(): HasMany
    {
        return $this->hasMany(Post::class, 'category_id');
    }

    public function url(): string
    {
        return '/blog/categoria/'.$this->slug;
    }
}
