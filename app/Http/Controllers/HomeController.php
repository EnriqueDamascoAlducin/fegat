<?php

namespace App\Http\Controllers;

use App\Models\Company;
use App\Models\HomeContent;
use App\Models\HomeSection;
use App\Models\Post;
use App\Models\VotingSetting;
use App\Services\Semaphore;
use Inertia\Inertia;
use Inertia\Response;

class HomeController extends Controller
{
    /**
     * Página pública con el semáforo del día.
     */
    public function __invoke(Semaphore $semaphore): Response
    {
        $content = HomeContent::current();

        return Inertia::render('welcome', [
            'semaphore' => VotingSetting::current()->public_visible ? $semaphore->status() : null,
            'content' => $content->only(['hero_title', 'hero_text', 'semaphore_text', 'contact_text']),
            'heroImage' => $content->hero_image_url ?? $this->defaultHeroImage(),
            'sections' => HomeSection::query()
                ->where('is_visible', true)
                ->orderBy('position')
                ->orderBy('id')
                ->get(['id', 'title', 'body', 'image_path']),
            'posts' => Post::query()->published()->latest('published_at')->limit(3)->get()->map->toCard(),
            'companies' => Company::query()
                ->where('is_active', true)
                ->orderBy('name')
                ->get(['id', 'name', 'website_url', 'logo_path']),
        ]);
    }

    private function defaultHeroImage(): ?string
    {
        return is_file(public_path('images/fegat-icon.png')) ? '/images/fegat-icon.png' : null;
    }
}
