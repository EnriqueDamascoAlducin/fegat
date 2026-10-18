<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Concerns\SyncsUploadedImage;
use App\Http\Controllers\Controller;
use App\Models\BlogCategory;
use App\Models\BlogTag;
use App\Models\Post;
use App\Models\User;
use App\Support\RichText;
use Closure;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Artículos del blog (port de BlogPostController de sav_3).
 */
class PostController extends Controller
{
    use SyncsUploadedImage;

    public function index(Request $request): Response
    {
        $search = trim((string) $request->query('search', ''));
        $status = (string) $request->query('status', '');

        return Inertia::render('admin/blog/index', [
            'posts' => Post::query()->with(['author:id,name', 'category:id,name'])
                ->when($search !== '', fn (Builder $query) => $query->where(fn (Builder $sub) => $sub
                    ->where('title', 'like', "%{$search}%")
                    ->orWhere('slug', 'like', "%{$search}%")))
                ->when($status === 'draft', fn (Builder $query) => $query->where('status', Post::DRAFT))
                ->when($status === 'scheduled', fn (Builder $query) => $query->where('status', Post::PUBLISHED)->where('published_at', '>', now()))
                ->when($status === 'published', fn (Builder $query) => $query->published())
                ->when($request->integer('category_id'), fn (Builder $query, int $id) => $query->where('category_id', $id))
                ->when($request->integer('author_id'), fn (Builder $query, int $id) => $query->where('user_id', $id))
                ->latest('updated_at')
                ->paginate(15)
                ->withQueryString()
                ->through(fn (Post $post) => [
                    'id' => $post->id,
                    'title' => $post->title,
                    'slug' => $post->slug,
                    'url' => $post->url(),
                    'cover_url' => $post->cover_url,
                    'state' => $post->publicationState(),
                    'is_featured' => $post->is_featured,
                    'published_at' => $post->published_at?->toIso8601String(),
                    'author' => $post->authorName(),
                    'category' => $post->category?->name,
                ]),
            'filters' => $request->only(['search', 'status', 'category_id', 'author_id']),
            'categories' => BlogCategory::query()->orderBy('sort_order')->orderBy('name')->get(['id', 'name']),
            'authors' => $this->authors(),
        ]);
    }

    public function create(Request $request): Response
    {
        return $this->form(new Post(['user_id' => $request->user()->id]));
    }

    public function store(Request $request): RedirectResponse
    {
        $post = Post::query()->create($this->validated($request));
        $this->syncImage($request, $post, 'cover_image_path', 'cover', 'blog');
        $post->tags()->sync($request->input('tag_ids', []));

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Artículo creado.']);

        return to_route('admin.posts.edit', $post);
    }

    public function edit(Post $post): Response
    {
        return $this->form($post);
    }

    public function update(Request $request, Post $post): RedirectResponse
    {
        $post->update($this->validated($request, $post));
        $this->syncImage($request, $post, 'cover_image_path', 'cover', 'blog');
        $post->tags()->sync($request->input('tag_ids', []));

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Artículo actualizado.']);

        return back();
    }

    public function destroy(Post $post): RedirectResponse
    {
        if ($post->cover_image_path) {
            Storage::disk('public')->delete($post->cover_image_path);
        }

        $post->delete();

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Artículo eliminado.']);

        return to_route('admin.posts.index');
    }

    /**
     * Guarda una imagen insertada dentro del texto de un artículo y devuelve su dirección.
     */
    public function image(Request $request): JsonResponse
    {
        $request->validate([
            'image' => ['required', 'image', 'mimes:png,jpg,jpeg,webp', 'max:4096'],
        ]);

        return response()->json([
            'url' => '/storage/'.$request->file('image')->store('blog/contenido', 'public'),
        ]);
    }

    private function form(Post $post): Response
    {
        return Inertia::render('admin/blog/form', [
            'post' => [
                'id' => $post->id,
                'title' => $post->title ?? '',
                'slug' => $post->slug ?? '',
                'excerpt' => $post->excerpt ?? '',
                'body' => $post->body ?? '',
                'cover_url' => $post->cover_url,
                'cover_alt' => $post->cover_alt ?? '',
                'user_id' => $post->user_id,
                'category_id' => $post->category_id,
                'tag_ids' => $post->exists ? $post->tags()->pluck('blog_tags.id')->all() : [],
                'status' => $post->status ?: Post::DRAFT,
                'published_at' => $post->published_at?->format('Y-m-d\TH:i'),
                'is_featured' => (bool) $post->is_featured,
                'url' => $post->exists ? $post->url() : null,
                'meta_title' => $post->meta_title ?? '',
                'meta_description' => $post->meta_description ?? '',
                'meta_keywords' => $post->meta_keywords ?? '',
                'og_title' => $post->og_title ?? '',
                'og_description' => $post->og_description ?? '',
                'canonical_url' => $post->canonical_url ?? '',
            ],
            'categories' => BlogCategory::query()->where('is_active', true)->orderBy('sort_order')->orderBy('name')->get(['id', 'name']),
            'tags' => BlogTag::query()->where('is_active', true)->orderBy('name')->get(['id', 'name']),
            'authors' => $this->authors(),
        ]);
    }

    /**
     * @return array<string, mixed>
     */
    private function validated(Request $request, ?Post $post = null): array
    {
        $validated = $request->validate([
            'title' => ['required', 'string', 'max:160'],
            'slug' => ['nullable', 'string', 'max:160', 'regex:/^[a-z0-9]+(?:-[a-z0-9]+)*$/', Rule::unique(Post::class)->ignore($post)],
            'excerpt' => ['nullable', 'string', 'max:1000'],
            'body' => [
                'required',
                'string',
                'max:200000',
                fn (string $attribute, mixed $value, Closure $fail) => RichText::isBlank((string) $value)
                    ? $fail('Escribe el contenido del artículo.')
                    : null,
            ],
            'cover' => ['nullable', 'image', 'mimes:png,jpg,jpeg,webp', 'max:4096'],
            'cover_alt' => ['nullable', 'string', 'max:255'],
            'user_id' => ['nullable', 'integer', Rule::exists(User::class, 'id')],
            'category_id' => ['nullable', 'integer', Rule::exists(BlogCategory::class, 'id')],
            'tag_ids' => ['array'],
            'tag_ids.*' => ['integer', 'distinct', Rule::exists(BlogTag::class, 'id')],
            'status' => ['required', Rule::in([Post::DRAFT, Post::PUBLISHED])],
            'published_at' => ['nullable', 'date'],
            'is_featured' => ['boolean'],
            'meta_title' => ['nullable', 'string', 'max:255'],
            'meta_description' => ['nullable', 'string', 'max:500'],
            'meta_keywords' => ['nullable', 'string', 'max:500'],
            'og_title' => ['nullable', 'string', 'max:255'],
            'og_description' => ['nullable', 'string', 'max:500'],
            'canonical_url' => ['nullable', 'url:https,http', 'max:2048'],
        ], [
            'slug.regex' => 'Usa solo minúsculas, números y guiones.',
            'slug.unique' => 'Otro artículo ya usa esa dirección.',
        ]);

        $published = $validated['status'] === Post::PUBLISHED;
        $slug = $validated['slug'] ?? null;

        return [
            'title' => $validated['title'],
            'slug' => $slug ?: $this->uniqueSlug($validated['title'], $post),
            // Sin resumen propio se usa el inicio del texto.
            'excerpt' => filled($validated['excerpt'] ?? null)
                ? $validated['excerpt']
                : Str::limit(RichText::plainText($validated['body']), 200),
            'body' => $validated['body'],
            'cover_alt' => $validated['cover_alt'] ?? null,
            'user_id' => $validated['user_id'] ?? null,
            'category_id' => $validated['category_id'] ?? null,
            'status' => $validated['status'],
            // Al publicar sin fecha se usa la de hoy; al volver a borrador se conserva la anterior.
            'published_at' => $published
                ? ($validated['published_at'] ?? $post->published_at ?? now())
                : ($post?->published_at),
            'is_featured' => $request->boolean('is_featured'),
            ...collect(['meta_title', 'meta_description', 'meta_keywords', 'og_title', 'og_description', 'canonical_url'])
                ->mapWithKeys(fn (string $field) => [$field => $validated[$field] ?? null])
                ->all(),
        ];
    }

    private function uniqueSlug(string $title, ?Post $post): string
    {
        $base = Str::slug($title) ?: 'articulo';
        $slug = $base;

        for ($suffix = 2; Post::query()->where('slug', $slug)->when($post, fn (Builder $q) => $q->whereKeyNot($post->id))->exists(); $suffix++) {
            $slug = $base.'-'.$suffix;
        }

        return $slug;
    }

    /**
     * @return array<int, array{id: int, name: string}>
     */
    private function authors(): array
    {
        return User::query()
            ->orderBy('name')
            ->get(['id', 'name'])
            ->map(fn (User $user) => ['id' => $user->id, 'name' => $user->name])
            ->values()
            ->all();
    }
}
