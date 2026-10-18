<?php

namespace App\Support;

use App\Models\Company;
use App\Models\HomeContent;
use App\Models\Page;
use App\Models\Post;
use App\Models\VotingSetting;
use App\Services\Semaphore;
use App\Services\Weather;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Pinta una página del constructor. Solo consulta lo que piden sus bloques: el semáforo,
 * el clima, las empresas o el blog se cargan si la página tiene ese bloque visible.
 */
final class PageRenderer
{
    public function __construct(private Semaphore $semaphore, private Weather $weather) {}

    /**
     * @param  array<string, mixed>|null  $content  Borrador de la vista previa; si falta, el guardado.
     */
    public function render(Page $page, ?array $content = null, bool $preview = false): Response
    {
        $content = $content === null ? $page->pageContent() : PageContent::sanitize($content);
        $content['blocks'] = $this->resolveButtons(array_values(array_filter($content['blocks'], fn (array $block) => $block['enabled'])));
        $types = array_column($content['blocks'], 'type');
        $has = fn (string $type) => in_array($type, $types, true);

        return Inertia::render('page', [
            'page' => ['id' => $page->id, 'title' => $page->title, 'url' => $page->url(), 'is_home' => $page->is_home],
            'content' => $content,
            'isPreview' => $preview,
            'semaphore' => $has('semaphore') && VotingSetting::current()->public_visible ? $this->semaphore->status() : null,
            // Diferido: la página no espera a Open-Meteo.
            'weather' => $has('weather')
                ? Inertia::defer(fn () => $this->weather->forecast($this->semaphore->session()['flight_date']))
                : null,
            'companies' => $has('associates') ? Company::query()
                ->where('is_active', true)
                ->orderBy('name')
                ->get(['id', 'name', 'website_url', 'logo_path']) : [],
            'posts' => $has('posts') ? Post::query()->published()->with(['author', 'category'])->latest('published_at')
                ->limit($this->postsLimit($content['blocks']))->get()->map->toCard() : [],
            'contact' => $has('contact') ? HomeContent::current()->only(HomeContent::CONTACT_FIELDS) : null,
        ]);
    }

    /**
     * Los botones que apuntan a una página o artículo usan su URL actual.
     *
     * @param  list<array<string, mixed>>  $blocks
     * @return list<array<string, mixed>>
     */
    private function resolveButtons(array $blocks): array
    {
        $links = new SiteLinks;

        return array_map(function (array $block) use ($links) {
            foreach (['primary', 'secondary'] as $prefix) {
                if (isset($block['settings']["{$prefix}_link_type"])) {
                    $block['settings']["{$prefix}_url"] = $links->url(
                        $block['settings']["{$prefix}_link_type"],
                        $block['settings']["{$prefix}_ref_id"] ?? null,
                        $block['settings']["{$prefix}_url"] ?? '',
                    );
                }
            }

            return $block;
        }, $blocks);
    }

    /**
     * @param  list<array<string, mixed>>  $blocks
     */
    private function postsLimit(array $blocks): int
    {
        $limits = array_map(
            fn (array $block) => (int) ($block['settings']['limit'] ?? 3),
            array_filter($blocks, fn (array $block) => $block['type'] === 'posts'),
        );

        return max(1, min(12, max($limits ?: [3])));
    }
}
