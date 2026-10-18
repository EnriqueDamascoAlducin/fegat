<?php

namespace App\Http\Controllers;

use App\Models\BlogCategory;
use App\Models\BlogTag;
use App\Models\Post;
use App\Support\BlogSettings;
use App\Support\SiteLinks;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Illuminate\Http\Response as HttpResponse;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Blog público (port del BlogController de la tienda de sav_3).
 */
class BlogController extends Controller
{
    public function index(Request $request): Response
    {
        return $this->renderIndex($request);
    }

    public function category(Request $request, string $slug): Response
    {
        $category = BlogCategory::query()->where('slug', $slug)->where('is_active', true)->firstOrFail();

        return $this->renderIndex($request, $category);
    }

    public function tag(Request $request, string $slug): Response
    {
        $tag = BlogTag::query()->where('slug', $slug)->where('is_active', true)->firstOrFail();

        return $this->renderIndex($request, tag: $tag);
    }

    /**
     * Los borradores y programados solo los puede abrir el super admin, como vista previa.
     */
    public function show(Request $request, Post $post): Response
    {
        $config = $this->config();
        $isAdmin = $request->user()?->isSuperAdmin() === true;

        abort_unless(($config['enabled'] && $post->isPublished()) || $isAdmin, 404);

        $post->load(['author', 'category', 'tags']);
        $tagIds = $post->tags->pluck('id');

        $related = $config['related_count'] > 0 ? Post::query()->published()->with(['author', 'category'])
            ->whereKeyNot($post->id)
            ->where(fn (Builder $query) => $query
                ->when($post->category_id, fn (Builder $q) => $q->where('category_id', $post->category_id))
                ->when($tagIds->isNotEmpty(), fn (Builder $q) => $q->orWhereHas('tags', fn (Builder $tags) => $tags->whereIn('blog_tags.id', $tagIds))))
            ->latest('published_at')
            ->limit($config['related_count'])
            ->get()
            ->map->toCard() : [];

        $cta = $config['cta'];
        $cta['url'] = (new SiteLinks)->url($cta['link_type'], $cta['ref_id'], $cta['url']);

        return Inertia::render('blog/show', [
            'post' => [
                ...$post->toCard(),
                'body' => $post->body,
                'cover_alt' => $post->cover_alt,
                'is_draft' => ! $post->isPublished(),
                'state' => $post->publicationState(),
                'tags' => $post->tags->where('is_active', true)->map(fn (BlogTag $tag) => ['name' => $tag->name, 'url' => $tag->url()])->values(),
            ],
            'related' => $related,
            'cta' => $cta['enabled'] && $cta['url'] ? $cta : null,
            'seo' => [
                'title' => $post->meta_title ?: $post->title,
                'description' => $post->meta_description ?: $post->excerpt,
                'keywords' => $post->meta_keywords,
                'og_title' => $post->og_title ?: $post->title,
                'og_description' => $post->og_description ?: ($post->meta_description ?: $post->excerpt),
                'image' => $post->cover_url ? url($post->cover_url) : null,
                'canonical' => $post->canonical_url ?: url($post->url()),
                'published_at' => $post->published_at?->toIso8601String(),
                'modified_at' => $post->updated_at?->toIso8601String(),
            ],
        ]);
    }

    public function feed(): HttpResponse
    {
        $config = $this->config();

        abort_unless($config['enabled'], 404);

        return response()->view('feeds.blog', [
            'title' => $config['title'],
            'description' => $config['subtitle'],
            'posts' => Post::query()->published()->latest('published_at')->limit(30)->get(),
        ], 200, ['Content-Type' => 'application/rss+xml; charset=UTF-8']);
    }

    private function renderIndex(Request $request, ?BlogCategory $category = null, ?BlogTag $tag = null): Response
    {
        $config = $this->config();

        abort_unless($config['enabled'], 404);

        $term = trim((string) $request->query('q', ''));
        $query = Post::query()->published()->with(['author', 'category'])
            ->when($category, fn (Builder $q) => $q->where('category_id', $category->id))
            ->when($tag, fn (Builder $q) => $q->whereHas('tags', fn (Builder $tags) => $tags->whereKey($tag->id)))
            ->when($term !== '', fn (Builder $q) => $q->where(fn (Builder $sub) => $sub
                ->where('title', 'like', "%{$term}%")
                ->orWhere('excerpt', 'like', "%{$term}%")));

        $featured = null;

        if ($config['show_featured'] && ! $category && ! $tag && $term === '' && ! $request->filled('page')) {
            $featured = (clone $query)->where('is_featured', true)->latest('published_at')->first();

            if ($featured) {
                $query->whereKeyNot($featured->id);
            }
        }

        $title = $category->name ?? $tag->name ?? $config['title'];
        $description = $category ? ($category->description ?? '') : ($tag ? '' : $config['subtitle']);

        return Inertia::render('blog/index', [
            'heading' => ['title' => $title, 'description' => $description, 'eyebrow' => $category ? 'Categoría' : ($tag ? 'Etiqueta' : null)],
            'heroUrl' => $category || $tag ? null : ($config['hero_image'] ?: null),
            'featured' => $featured?->toCard(),
            'posts' => $query->latest('published_at')->paginate($config['posts_per_page'])->withQueryString()->through(fn (Post $post) => $post->toCard()),
            'categories' => BlogCategory::query()->where('is_active', true)->orderBy('sort_order')->orderBy('name')->get()
                ->map(fn (BlogCategory $item) => ['id' => $item->id, 'name' => $item->name, 'url' => $item->url()]),
            'tags' => BlogTag::query()->where('is_active', true)->whereHas('posts', fn (Builder $q) => $q->published())->orderBy('name')->get()
                ->map(fn (BlogTag $item) => ['id' => $item->id, 'name' => $item->name, 'url' => $item->url()]),
            'activeCategory' => $category?->id,
            'query' => $term,
            'seo' => [
                'title' => $category?->meta_title ?: $title,
                'description' => $category?->meta_description ?: $description,
                // Las búsquedas son variantes infinitas del índice: no se indexan.
                'robots' => $term !== '' ? 'noindex, follow' : null,
            ],
        ]);
    }

    /**
     * @return array<string, mixed>
     */
    private function config(): array
    {
        return BlogSettings::get();
    }
}
