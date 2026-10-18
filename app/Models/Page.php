<?php

namespace App\Models;

use App\Support\PageContent;
use App\Support\SiteLayout;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\Str;

/**
 * Página del sitio público armada por bloques desde el panel. Una de ellas es el inicio («/»).
 *
 * @property string|null $slug Vacío solo en el inicio.
 * @property string $title
 * @property bool $is_home
 * @property bool $is_active
 * @property array<string, mixed>|null $content Tema, bloques y SEO (ver App\Support\PageContent).
 */
#[Fillable(['slug', 'title', 'is_home', 'is_active', 'content'])]
class Page extends Model
{
    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'is_home' => 'boolean',
            'is_active' => 'boolean',
            'content' => 'array',
        ];
    }

    protected static function booted(): void
    {
        // El menú y el footer resuelven los enlaces a páginas por id: un cambio de slug se refleja.
        static::saved(fn () => SiteLayout::forget());
        static::deleted(fn () => SiteLayout::forget());
    }

    public static function home(): ?self
    {
        return static::query()->where('is_home', true)->first();
    }

    public function url(): string
    {
        return $this->is_home ? '/' : '/'.$this->slug;
    }

    /**
     * @return array{theme: array<string, mixed>, blocks: list<array<string, mixed>>, seo: array<string, string>}
     */
    public function pageContent(): array
    {
        return PageContent::sanitize($this->content ?? []);
    }

    /**
     * Un slug choca con el sistema si ya lo atiende otra ruta (blog, admin, login…):
     * la página nunca se vería.
     */
    public static function slugIsReserved(string $slug): bool
    {
        try {
            $route = Route::getRoutes()->match(Request::create('/'.$slug));
        } catch (\Throwable) {
            return false;
        }

        return ! $route->isFallback;
    }

    public static function uniqueSlug(string $title, ?int $ignoreId = null): string
    {
        $base = Str::slug($title) ?: 'pagina';
        $slug = $base;

        for ($i = 2; static::slugTaken($slug, $ignoreId); $i++) {
            $slug = "{$base}-{$i}";
        }

        return $slug;
    }

    public static function slugTaken(string $slug, ?int $ignoreId = null): bool
    {
        return static::slugIsReserved($slug) || static::query()
            ->where('slug', $slug)
            ->when($ignoreId, fn (Builder $query) => $query->whereKeyNot($ignoreId))
            ->exists();
    }
}
