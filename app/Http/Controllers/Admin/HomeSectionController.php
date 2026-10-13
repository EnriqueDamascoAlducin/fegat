<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Concerns\SyncsUploadedImage;
use App\Http\Controllers\Controller;
use App\Models\HomeSection;
use App\Support\RichText;
use Closure;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;
use Inertia\Inertia;

class HomeSectionController extends Controller
{
    use SyncsUploadedImage;

    public function store(Request $request): RedirectResponse
    {
        $section = HomeSection::query()->create([
            ...$this->validated($request),
            'position' => (int) HomeSection::query()->max('position') + 1,
        ]);
        $this->syncImage($request, $section, 'image_path', 'image', 'home');

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Sección agregada.']);

        return to_route('admin.home.edit');
    }

    public function update(Request $request, HomeSection $section): RedirectResponse
    {
        $section->update($this->validated($request));
        $this->syncImage($request, $section, 'image_path', 'image', 'home');

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Sección actualizada.']);

        return to_route('admin.home.edit');
    }

    public function destroy(HomeSection $section): RedirectResponse
    {
        if ($section->image_path) {
            Storage::disk('public')->delete($section->image_path);
        }

        $section->delete();

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Sección eliminada.']);

        return to_route('admin.home.edit');
    }

    /**
     * Guarda una imagen insertada dentro del texto de una sección y devuelve su dirección.
     */
    public function image(Request $request): JsonResponse
    {
        $request->validate([
            'image' => ['required', 'image', 'mimes:png,jpg,jpeg,webp', 'max:2048'],
        ]);

        return response()->json([
            'url' => '/storage/'.$request->file('image')->store('home/contenido', 'public'),
        ]);
    }

    /**
     * Sube o baja la sección un lugar intercambiándola con su vecina.
     */
    public function move(Request $request, HomeSection $section): RedirectResponse
    {
        $validated = $request->validate([
            'direction' => ['required', Rule::in(['up', 'down'])],
        ]);

        DB::transaction(function () use ($section, $validated) {
            $ordered = HomeSection::query()->orderBy('position')->orderBy('id')->lockForUpdate()->get();
            $index = $ordered->search(fn (HomeSection $item) => $item->is($section));
            $target = $index + ($validated['direction'] === 'up' ? -1 : 1);

            if ($index === false || ! $ordered->has($target)) {
                return;
            }

            $reordered = $ordered->all();
            [$reordered[$index], $reordered[$target]] = [$reordered[$target], $reordered[$index]];

            foreach ($reordered as $position => $item) {
                $item->update(['position' => $position + 1]);
            }
        });

        return to_route('admin.home.edit');
    }

    /**
     * @return array{title: string, body: string, is_visible: bool}
     */
    private function validated(Request $request): array
    {
        $validated = $request->validate([
            'title' => ['required', 'string', 'max:120'],
            'body' => [
                'required',
                'string',
                'max:20000',
                // Un editor vacío manda «<p></p>»: se exige texto real.
                fn (string $attribute, mixed $value, Closure $fail) => RichText::isBlank((string) $value)
                    ? $fail('Escribe el texto de la sección.')
                    : null,
            ],
            'image' => ['nullable', 'image', 'mimes:png,jpg,jpeg,webp', 'max:2048'],
        ]);

        return [
            'title' => $validated['title'],
            'body' => $validated['body'],
            'is_visible' => $request->boolean('is_visible'),
        ];
    }
}
