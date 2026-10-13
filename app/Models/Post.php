<?php

namespace App\Models;

use App\Support\RichText;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Carbon;

/**
 * Publicación del blog.
 *
 * @property string $title
 * @property string $slug
 * @property string $excerpt
 * @property string $body HTML del editor con formato, siempre saneado al guardar.
 * @property string|null $cover_image_path
 * @property Carbon|null $published_at Vacío mientras es borrador.
 * @property-read string|null $cover_url
 */
#[Fillable(['title', 'slug', 'excerpt', 'body', 'cover_image_path', 'published_at', 'user_id'])]
class Post extends Model
{
    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'published_at' => 'datetime',
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
    protected function coverUrl(): Attribute
    {
        return Attribute::get(fn () => $this->cover_image_path ? '/storage/'.$this->cover_image_path : null);
    }

    /**
     * @param  Builder<Post>  $query
     */
    public function scopePublished(Builder $query): void
    {
        $query->whereNotNull('published_at')->where('published_at', '<=', now());
    }

    public function isPublished(): bool
    {
        return $this->published_at !== null && $this->published_at->lte(now());
    }

    /**
     * Fecha de publicación como «13 de octubre de 2026».
     */
    public function publishedDate(): ?string
    {
        return $this->published_at?->translatedFormat('j \d\e F \d\e Y');
    }

    /**
     * Datos de la tarjeta que se muestra en los listados públicos.
     *
     * @return array{id: int, title: string, slug: string, excerpt: string, cover_url: string|null, date: string|null}
     */
    public function toCard(): array
    {
        return [
            'id' => $this->id,
            'title' => $this->title,
            'slug' => $this->slug,
            'excerpt' => $this->excerpt,
            'cover_url' => $this->cover_url,
            'date' => $this->publishedDate(),
        ];
    }
}
