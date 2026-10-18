<?php

namespace App\Support;

use App\Models\BlogCategory;
use App\Models\BlogTag;
use App\Models\Page;
use App\Models\Post;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Collection;

/**
 * Destinos que el panel ofrece para menús, footer y botones de bloques. Un enlace guarda su
 * tipo y el id del destino, y la URL se vuelve a calcular al mostrarlo: si cambia el slug de
 * una página, un artículo o una categoría, los enlaces siguen funcionando.
 */
final class SiteLinks
{
    public const TYPES = ['page', 'blog', 'blog_post', 'blog_category', 'blog_tag', 'custom'];

    /** Tipos que apuntan a un registro concreto (guardan su id). */
    private const REFERENCED = ['page', 'blog_post', 'blog_category', 'blog_tag'];

    /** @var array<string, Collection<int, Model>> */
    private array $cache = [];

    /**
     * Opciones del selector de enlaces del panel.
     *
     * @return array<string, mixed>
     */
    public static function options(): array
    {
        $item = fn (int $id, string $label, string $url) => ['id' => $id, 'label' => $label, 'url' => $url];

        return [
            'blog' => ['label' => 'Blog', 'url' => '/blog'],
            'pages' => Page::query()->orderByDesc('is_home')->orderBy('title')->get()
                ->map(fn (Page $page) => $item($page->id, $page->title, $page->url()))->values()->all(),
            'blog_posts' => Post::query()->published()->latest('published_at')->limit(100)->get(['id', 'title', 'slug'])
                ->map(fn (Post $post) => $item($post->id, $post->title, $post->url()))->values()->all(),
            'blog_categories' => BlogCategory::query()->where('is_active', true)->orderBy('sort_order')->orderBy('name')->get()
                ->map(fn (BlogCategory $category) => $item($category->id, $category->name, $category->url()))->values()->all(),
            'blog_tags' => BlogTag::query()->where('is_active', true)->orderBy('name')->get()
                ->map(fn (BlogTag $tag) => $item($tag->id, $tag->name, $tag->url()))->values()->all(),
        ];
    }

    /**
     * URL actual de un enlace guardado. Si su destino ya no existe se usa la URL guardada.
     */
    public function url(?string $type, mixed $refId, ?string $fallback): string
    {
        $fallback = PageContent::safeLink($fallback);
        $id = is_numeric($refId) ? (int) $refId : 0;

        if ($type === 'blog') {
            return '/blog';
        }

        $target = match ($type) {
            'page' => $this->find(Page::class, $id),
            'blog_post' => $this->find(Post::class, $id),
            'blog_category' => $this->find(BlogCategory::class, $id),
            'blog_tag' => $this->find(BlogTag::class, $id),
            default => null,
        };

        /** @var Page|Post|BlogCategory|BlogTag|null $target */
        return $target ? $target->url() : $fallback;
    }

    /**
     * Limpia un enlace que llega del panel.
     *
     * @param  array<string, mixed>  $link
     * @return array{label: string, url: string, link_type: string, ref_id: int|null, open_in_new_tab: bool}
     */
    public static function clean(array $link): array
    {
        $type = in_array($link['link_type'] ?? null, self::TYPES, true) ? $link['link_type'] : 'custom';

        return [
            'label' => mb_substr(trim((string) (is_scalar($link['label'] ?? null) ? $link['label'] : '')), 0, 80),
            'url' => PageContent::safeLink($link['url'] ?? ''),
            'link_type' => $type,
            'ref_id' => in_array($type, self::REFERENCED, true) && is_numeric($link['ref_id'] ?? null) ? (int) $link['ref_id'] : null,
            'open_in_new_tab' => ($link['open_in_new_tab'] ?? false) === true,
        ];
    }

    /**
     * Un solo query por tipo aunque el menú tenga muchos enlaces.
     *
     * @param  class-string<Model>  $model
     */
    private function find(string $model, int $id): ?Model
    {
        if ($id === 0) {
            return null;
        }

        // Solo lo que necesita url(): sin el cuerpo de los artículos.
        $columns = $model === Page::class ? ['id', 'slug', 'is_home'] : ['id', 'slug'];

        return ($this->cache[$model] ??= $model::query()->get($columns)->keyBy('id'))->get($id);
    }
}
