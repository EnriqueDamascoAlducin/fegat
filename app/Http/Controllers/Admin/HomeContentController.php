<?php

namespace App\Http\Controllers\Admin;

use App\Enums\SitePage;
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
                ...$content->only(['hero_title', 'hero_text', 'semaphore_text', 'contact_text', ...HomeContent::CONTACT_FIELDS]),
                'hero_image_url' => $content->hero_image_url,
            ],
            'pages' => array_map(
                fn (SitePage $page) => ['value' => $page->value, 'label' => $page->label()],
                SitePage::cases(),
            ),
            'sections' => HomeSection::query()
                ->orderBy('position')
                ->orderBy('id')
                ->get(['id', 'page', 'title', 'body', 'image_path', 'is_visible']),
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
            'contact_email' => ['nullable', 'string', 'email', 'max:255'],
            'contact_phones' => ['nullable', 'string', 'max:255'],
            'contact_hours' => ['nullable', 'string', 'max:255'],
            'contact_address' => ['nullable', 'string', 'max:500'],
            'map_url' => ['nullable', 'url:https', 'max:1000'],
            'facebook_url' => ['nullable', 'url:https', 'max:255'],
            'instagram_url' => ['nullable', 'url:https', 'max:255'],
            'tiktok_url' => ['nullable', 'url:https', 'max:255'],
            'youtube_url' => ['nullable', 'url:https', 'max:255'],
        ]);

        $content = HomeContent::current();
        $content->update([
            'hero_title' => $validated['hero_title'],
            'semaphore_text' => $validated['semaphore_text'],
            'contact_text' => $validated['contact_text'],
            ...collect(['hero_text', ...HomeContent::CONTACT_FIELDS])
                ->mapWithKeys(fn (string $field) => [$field => $validated[$field] ?? null])
                ->all(),
        ]);
        $this->syncImage($request, $content, 'hero_image_path', 'hero_image', 'home');

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Sitio público actualizado.']);

        return to_route('admin.home.edit');
    }
}
