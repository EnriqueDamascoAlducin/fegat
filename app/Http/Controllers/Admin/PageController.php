<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Page;
use App\Support\PageContent;
use App\Support\PageRenderer;
use App\Support\SiteLinks;
use Closure;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Constructor de páginas por bloques (port de «Página por bloques» de sav_3).
 */
class PageController extends Controller
{
    public function index(): Response
    {
        return Inertia::render('admin/pages/index', [
            'pages' => Page::query()->orderByDesc('is_home')->orderBy('title')->get()->map(fn (Page $page) => [
                'id' => $page->id,
                'title' => $page->title,
                'url' => $page->url(),
                'is_home' => $page->is_home,
                'is_active' => $page->is_active,
                'blocks_count' => count($page->content['blocks'] ?? []),
                'updated_at' => $page->updated_at?->diffForHumans(),
            ]),
        ]);
    }

    public function store(): RedirectResponse
    {
        $page = Page::query()->create([
            'title' => 'Nueva página',
            'slug' => Page::uniqueSlug('nueva-pagina'),
            'is_active' => false,
            'content' => [
                ...PageContent::empty(),
                'blocks' => [[
                    'id' => 'hero-'.bin2hex(random_bytes(4)),
                    'type' => 'hero',
                    'enabled' => true,
                    'settings' => [
                        'title' => '<p>Título de la página</p>',
                        'subtitle' => '<p>Escribe una introducción clara para los visitantes.</p>',
                        'align' => 'center',
                    ],
                ]],
            ],
        ]);

        return to_route('admin.pages.edit', $page);
    }

    public function edit(Page $page): Response
    {
        return Inertia::render('admin/pages/edit', [
            'page' => [
                'id' => $page->id,
                'title' => $page->title,
                'slug' => $page->slug ?? '',
                'url' => $page->url(),
                'is_home' => $page->is_home,
                'is_active' => $page->is_active,
                'content' => $page->pageContent(),
            ],
            'navOptions' => SiteLinks::options(),
        ]);
    }

    public function update(Request $request, Page $page): RedirectResponse
    {
        $data = $this->validated($request, $page);

        $page->update([
            'title' => $data['title'],
            'slug' => $page->is_home ? $page->slug : $data['slug'],
            // El inicio siempre está publicado.
            'is_active' => $page->is_home || $request->boolean('is_active'),
            'content' => PageContent::sanitize($data['content']),
        ]);

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Página guardada.']);

        return back();
    }

    public function destroy(Page $page): RedirectResponse
    {
        abort_if($page->is_home, 422, 'El inicio no se puede eliminar.');

        $page->delete();

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Página eliminada.']);

        return to_route('admin.pages.index');
    }

    /**
     * Convierte la página en el inicio del sitio. La anterior conserva (o recibe) su propio slug.
     */
    public function makeHome(Page $page): RedirectResponse
    {
        DB::transaction(function () use ($page) {
            Page::query()->where('is_home', true)->whereKeyNot($page->id)->get()->each(function (Page $previous) {
                $previous->update([
                    'is_home' => false,
                    'slug' => $previous->slug ?: Page::uniqueSlug($previous->title, $previous->id),
                ]);
            });

            $page->update(['is_home' => true, 'is_active' => true]);
        });

        Inertia::flash('toast', ['type' => 'success', 'message' => "«{$page->title}» es ahora el inicio."]);

        return to_route('admin.pages.index');
    }

    /**
     * Guarda el borrador del editor en caché (nunca en la base de datos) y devuelve dónde verlo.
     */
    public function preview(Request $request, Page $page): JsonResponse
    {
        $data = $this->validated($request, $page);

        Cache::put($this->previewKey($request, $page), [
            'title' => $data['title'],
            'content' => $data['content'],
        ], now()->addHours(2));

        return response()->json(['url' => route('admin.pages.preview.show', $page)]);
    }

    public function showPreview(Request $request, Page $page, PageRenderer $renderer): Response
    {
        $draft = Cache::get($this->previewKey($request, $page));

        abort_unless(is_array($draft), 404, 'La vista previa expiró. Genérala de nuevo desde el editor.');

        $page->title = $draft['title'];

        return $renderer->render($page, $draft['content'], preview: true);
    }

    /**
     * Imagen de un bloque, del logo o del SEO. Devuelve su dirección y tamaño.
     */
    public function uploadImage(Request $request): JsonResponse
    {
        $request->validate([
            'image' => ['required', 'image', 'mimes:png,jpg,jpeg,webp,gif', 'max:5120'],
        ]);

        return response()->json($this->storeImage($request->file('image')));
    }

    /**
     * Varias imágenes a la vez (carga masiva de la galería), en el orden recibido.
     */
    public function uploadImages(Request $request): JsonResponse
    {
        $request->validate([
            'images' => ['required', 'array', 'min:1', 'max:40'],
            'images.*' => ['required', 'image', 'mimes:png,jpg,jpeg,webp,gif', 'max:5120'],
        ]);

        return response()->json([
            'urls' => array_map(fn (UploadedFile $file) => $this->storeImage($file)['url'], $request->file('images')),
        ]);
    }

    /**
     * @return array{url: string, width: int|null, height: int|null}
     */
    private function storeImage(UploadedFile $file): array
    {
        $size = @getimagesize($file->getRealPath()) ?: [null, null];

        return [
            'url' => '/storage/'.$file->store('paginas', 'public'),
            'width' => $size[0],
            'height' => $size[1],
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function validated(Request $request, Page $page): array
    {
        $validated = $request->validate([
            'title' => ['required', 'string', 'max:120'],
            'slug' => [
                $page->is_home ? 'nullable' : 'required',
                'string',
                'max:80',
                'regex:/^[a-z0-9]+(?:-[a-z0-9]+)*$/',
                fn (string $attribute, mixed $value, Closure $fail) => ! $page->is_home && Page::slugTaken((string) $value, $page->id)
                    ? $fail('Esa dirección ya la usa otra página o el sistema.')
                    : null,
            ],
            'content' => ['required', 'array'],
            'content.blocks' => ['present', 'array', 'max:'.PageContent::MAX_BLOCKS],
            'content.blocks.*.type' => ['required', 'string', 'in:'.implode(',', PageContent::BLOCK_TYPES)],
        ], [
            'slug.regex' => 'Usa solo minúsculas, números y guiones (por ejemplo «quienes-somos»).',
        ]);

        // validate() solo devuelve las llaves con regla; los ajustes de cada bloque los limpia
        // PageContent::sanitize al guardar o previsualizar.
        return [...$validated, 'content' => $request->input('content')];
    }

    private function previewKey(Request $request, Page $page): string
    {
        return "page-preview:{$request->user()->id}:{$page->id}";
    }
}
