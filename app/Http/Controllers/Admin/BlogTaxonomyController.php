<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\BlogCategory;
use App\Models\BlogTag;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Categorías y etiquetas del blog (port de BlogTaxonomyController de sav_3).
 */
class BlogTaxonomyController extends Controller
{
    public function index(): Response
    {
        return Inertia::render('admin/blog/taxonomies', [
            'categories' => BlogCategory::query()->withCount('posts')->orderBy('sort_order')->orderBy('name')->get()
                ->map(fn (BlogCategory $item) => [
                    ...$item->only(['id', 'name', 'slug', 'description', 'meta_title', 'meta_description', 'is_active', 'sort_order']),
                    'url' => $item->url(),
                    'posts_count' => $item->posts_count,
                ]),
            'tags' => BlogTag::query()->withCount('posts')->orderBy('name')->get()
                ->map(fn (BlogTag $item) => [
                    ...$item->only(['id', 'name', 'slug', 'is_active']),
                    'url' => $item->url(),
                    'posts_count' => $item->posts_count,
                ]),
        ]);
    }

    public function storeCategory(Request $request): RedirectResponse
    {
        return $this->save($request, new BlogCategory);
    }

    public function updateCategory(Request $request, BlogCategory $category): RedirectResponse
    {
        return $this->save($request, $category);
    }

    public function destroyCategory(BlogCategory $category): RedirectResponse
    {
        // Los artículos quedan sin categoría (la llave foránea pone null).
        $category->delete();

        return $this->saved('Categoría eliminada.');
    }

    public function storeTag(Request $request): RedirectResponse
    {
        return $this->save($request, new BlogTag);
    }

    public function updateTag(Request $request, BlogTag $tag): RedirectResponse
    {
        return $this->save($request, $tag);
    }

    public function destroyTag(BlogTag $tag): RedirectResponse
    {
        $tag->delete();

        return $this->saved('Etiqueta eliminada.');
    }

    private function save(Request $request, BlogCategory|BlogTag $model): RedirectResponse
    {
        $request->merge(['slug' => Str::slug((string) ($request->input('slug') ?: $request->input('name')))]);

        $rules = [
            'name' => ['required', 'string', 'max:120'],
            'slug' => ['required', 'string', 'max:120', Rule::unique($model::class)->ignore($model)],
            'is_active' => ['boolean'],
        ];

        if ($model instanceof BlogCategory) {
            $rules += [
                'description' => ['nullable', 'string', 'max:2000'],
                'meta_title' => ['nullable', 'string', 'max:255'],
                'meta_description' => ['nullable', 'string', 'max:500'],
                'sort_order' => ['nullable', 'integer', 'min:0', 'max:9999'],
            ];
        }

        $data = $request->validate($rules, ['slug.unique' => 'Ya existe otra con esa dirección.']);
        $data['is_active'] = $request->boolean('is_active');

        if ($model instanceof BlogCategory) {
            $data['sort_order'] = (int) ($data['sort_order'] ?? 0);
        }

        $model->fill($data)->save();

        return $this->saved($model->wasRecentlyCreated ? 'Elemento creado.' : 'Elemento actualizado.');
    }

    private function saved(string $message): RedirectResponse
    {
        Inertia::flash('toast', ['type' => 'success', 'message' => $message]);

        return back();
    }
}
