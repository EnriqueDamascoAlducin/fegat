<?php

namespace App\Models;

use App\Support\SiteLayout;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

/**
 * Etiqueta del blog, con su página de archivo en /blog/etiqueta/{slug}.
 *
 * @property string $name
 * @property string $slug
 * @property bool $is_active
 */
#[Fillable(['name', 'slug', 'is_active'])]
class BlogTag extends Model
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
        ];
    }

    protected static function booted(): void
    {
        static::saved(fn () => SiteLayout::forget());
        static::deleted(fn () => SiteLayout::forget());
    }

    /**
     * @return BelongsToMany<Post, $this>
     */
    public function posts(): BelongsToMany
    {
        return $this->belongsToMany(Post::class, 'blog_post_tag');
    }

    public function url(): string
    {
        return '/blog/etiqueta/'.$this->slug;
    }
}
