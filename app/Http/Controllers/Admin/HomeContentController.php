<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Concerns\SyncsUploadedImage;
use App\Http\Controllers\Controller;
use App\Models\HomeContent;
use App\Models\HomeSection;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class HomeContentController extends Controller
{
    use SyncsUploadedImage;

    public function edit(): Response
    {
        $content = HomeContent::current();

        return Inertia::render('admin/home', [
            'content' => [
                ...$content->only(['hero_title', 'hero_text', 'semaphore_text', 'contact_text']),
                'hero_image_url' => $content->hero_image_url,
            ],
            'sections' => HomeSection::query()
                ->orderBy('position')
                ->orderBy('id')
                ->get(['id', 'title', 'body', 'image_path', 'is_visible']),
        ]);
    }

    public function update(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'hero_title' => ['required', 'string', 'max:150'],
            'hero_text' => ['nullable', 'string', 'max:500'],
            'semaphore_text' => ['required', 'string', 'max:500'],
            'contact_text' => ['required', 'string', 'max:500'],
            'hero_image' => ['nullable', 'image', 'mimes:png,jpg,jpeg,webp', 'max:2048'],
        ]);

        $content = HomeContent::current();
        $content->update([
            'hero_title' => $validated['hero_title'],
            'hero_text' => $validated['hero_text'] ?? null,
            'semaphore_text' => $validated['semaphore_text'],
            'contact_text' => $validated['contact_text'],
        ]);
        $this->syncImage($request, $content, 'hero_image_path', 'hero_image', 'home');

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Página de inicio actualizada.']);

        return to_route('admin.home.edit');
    }
}
