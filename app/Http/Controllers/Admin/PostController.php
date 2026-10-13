<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Concerns\SyncsUploadedImage;
use App\Http\Controllers\Controller;
use App\Models\Post;
use App\Support\RichText;
use Closure;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;

class PostController extends Controller
{
    use SyncsUploadedImage;

    public function index(): Response
    {
        return Inertia::render('admin/blog/index', [
            'posts' => Post::query()
                ->latest()
                ->get()
                ->map(fn (Post $post) => [
                    ...$post->toCard(),
                    'is_published' => $post->isPublished(),
                ]),
        ]);
    }

    public function create(): Response
    {
        return Inertia::render('admin/blog/form', ['post' => null]);
    }

    public function store(Request $request): RedirectResponse
    {
        $validated = $this->validated($request);

        $post = Post::query()->create([
            ...$validated,
            'slug' => $this->uniqueSlug($validated['title']),
            'published_at' => $request->boolean('published') ? now() : null,
            'user_id' => $request->user()->id,
        ]);
        $this->syncImage($request, $post, 'cover_image_path', 'cover', 'blog');

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Publicación creada.']);

        return to_route('admin.posts.index');
    }

    public function edit(Post $post): Response
    {
        return Inertia::render('admin/blog/form', [
            'post' => [
                ...$post->only(['id', 'title', 'slug', 'excerpt', 'body']),
                'cover_url' => $post->cover_url,
                'is_published' => $post->published_at !== null,
            ],
        ]);
    }

    public function update(Request $request, Post $post): RedirectResponse
    {
        // La dirección (slug) no cambia al editar, para no romper enlaces ya compartidos.
        $post->update([
            ...$this->validated($request),
            'published_at' => $request->boolean('published') ? ($post->published_at ?? now()) : null,
        ]);
        $this->syncImage($request, $post, 'cover_image_path', 'cover', 'blog');

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Publicación actualizada.']);

        return to_route('admin.posts.index');
    }

    public function destroy(Post $post): RedirectResponse
    {
        if ($post->cover_image_path) {
            Storage::disk('public')->delete($post->cover_image_path);
        }

        $post->delete();

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Publicación eliminada.']);

        return to_route('admin.posts.index');
    }

    /**
     * Guarda una imagen insertada dentro del texto de una publicación y devuelve su dirección.
     */
    public function image(Request $request): JsonResponse
    {
        $request->validate([
            'image' => ['required', 'image', 'mimes:png,jpg,jpeg,webp', 'max:2048'],
        ]);

        return response()->json([
            'url' => '/storage/'.$request->file('image')->store('blog/contenido', 'public'),
        ]);
    }

    /**
     * @return array{title: string, excerpt: string, body: string}
     */
    private function validated(Request $request): array
    {
        $validated = $request->validate([
            'title' => ['required', 'string', 'max:160'],
            'excerpt' => ['nullable', 'string', 'max:300'],
            'body' => [
                'required',
                'string',
                'max:100000',
                fn (string $attribute, mixed $value, Closure $fail) => RichText::isBlank((string) $value)
                    ? $fail('Escribe el contenido de la publicación.')
                    : null,
            ],
            'cover' => ['nullable', 'image', 'mimes:png,jpg,jpeg,webp', 'max:4096'],
        ]);

        return [
            'title' => $validated['title'],
            // Sin resumen propio se usa el inicio del texto.
            'excerpt' => filled($validated['excerpt'] ?? null)
                ? $validated['excerpt']
                : Str::limit(RichText::plainText($validated['body']), 200),
            'body' => $validated['body'],
        ];
    }

    private function uniqueSlug(string $title): string
    {
        $base = Str::slug($title) ?: 'publicacion';
        $slug = $base;

        for ($suffix = 2; Post::query()->where('slug', $slug)->exists(); $suffix++) {
            $slug = $base.'-'.$suffix;
        }

        return $slug;
    }
}
