<?php

namespace App\Models;

use App\Support\RichText;
use App\Support\SiteLayout;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Support\Carbon;

/**
 * Artículo del blog (port de BlogPost de sav_3).
 *
 * @property string $status 'draft' o 'published'; publicado con fecha futura es «programado».
 * @property string $title
 * @property string $slug
 * @property string $excerpt
 * @property string $body HTML del editor con formato, siempre saneado al guardar.
 * @property string|null $cover_image_path
 * @property string|null $cover_alt
 * @property Carbon|null $published_at
 * @property int|null $user_id Autor; vacío es «Equipo FEGAT».
 * @property int|null $category_id
 * @property bool $is_featured
 * @property string|null $meta_title
 * @property string|null $meta_description
 * @property string|null $meta_keywords
 * @property string|null $og_title
 * @property string|null $og_description
 * @property string|null $canonical_url
 * @property-read string|null $cover_url
 */
#[Fillable([
    'status', 'title', 'slug', 'excerpt', 'body', 'cover_image_path', 'cover_alt', 'published_at', 'user_id',
    'category_id', 'is_featured', 'meta_title', 'meta_description', 'meta_keywords', 'og_title', 'og_description', 'canonical_url',
])]
class Post extends Model
{
    public const DRAFT = 'draft';

    public const PUBLISHED = 'published';

    /**
     * @var array<string, mixed>
     */
    protected $attributes = [
        'status' => self::DRAFT,
        'excerpt' => '',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'published_at' => 'datetime',
            'is_featured' => 'boolean',
        ];
    }

    protected static function booted(): void
    {
        // El menú y el footer pueden enlazar artículos por id.
        static::saved(fn () => SiteLayout::forget());
        static::deleted(fn () => SiteLayout::forget());
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function author(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    /**
     * @return BelongsTo<BlogCategory, $this>
     */
    public function category(): BelongsTo
    {
        return $this->belongsTo(BlogCategory::class, 'category_id');
    }

    /**
     * @return BelongsToMany<BlogTag, $this>
     */
    public function tags(): BelongsToMany
    {
        return $this->belongsToMany(BlogTag::class, 'blog_post_tag');
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
        $query->where('status', self::PUBLISHED)->whereNotNull('published_at')->where('published_at', '<=', now());
    }

    public function isPublished(): bool
    {
        return $this->status === self::PUBLISHED && $this->published_at !== null && $this->published_at->lte(now());
    }

    /**
     * 'draft', 'scheduled' (publicado con fecha futura) o 'published'.
     */
    public function publicationState(): string
    {
        if ($this->status !== self::PUBLISHED) {
            return self::DRAFT;
        }

        return $this->published_at?->isFuture() ? 'scheduled' : self::PUBLISHED;
    }

    /**
     * Minutos de lectura a 220 palabras por minuto.
     */
    public function readingTime(): int
    {
        return max(1, (int) ceil(str_word_count(RichText::plainText($this->body), 0, 'áéíóúüñÁÉÍÓÚÜÑ') / 220));
    }

    public function url(): string
    {
        return '/blog/'.$this->slug;
    }

    /**
     * Fecha de publicación como «13 de octubre de 2026».
     */
    public function publishedDate(): ?string
    {
        return $this->published_at?->translatedFormat('j \d\e F \d\e Y');
    }

    public function authorName(): string
    {
        return $this->author?->name ?: 'Equipo FEGAT';
    }

    /**
     * Datos de la tarjeta de los listados públicos. Carga antes `author` y `category`.
     *
     * @return array<string, mixed>
     */
    public function toCard(): array
    {
        return [
            'id' => $this->id,
            'title' => $this->title,
            'slug' => $this->slug,
            'url' => $this->url(),
            'excerpt' => $this->excerpt,
            'cover_url' => $this->cover_url,
            'date' => $this->publishedDate(),
            'category' => $this->category?->name,
            'category_url' => $this->category?->url(),
            'author' => $this->authorName(),
            'read_time' => $this->readingTime(),
        ];
    }
}
