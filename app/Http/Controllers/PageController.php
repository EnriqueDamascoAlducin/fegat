<?php

namespace App\Http\Controllers;

use App\Enums\SitePage;
use App\Models\Company;
use App\Models\HomeSection;
use Inertia\Inertia;
use Inertia\Response;

class PageController extends Controller
{
    /**
     * Página pública armada con las secciones que el super admin le asignó.
     */
    public function __invoke(SitePage $page): Response
    {
        return Inertia::render('page', [
            'page' => [
                'slug' => $page->value,
                'title' => $page->label(),
                'description' => $page->description(),
            ],
            'sections' => HomeSection::query()
                ->publishedOn($page)
                ->get(['id', 'title', 'body', 'image_path']),
            // «Quiénes somos» cierra con los asociados.
            'companies' => $page === SitePage::About ? Company::query()
                ->where('is_active', true)
                ->orderBy('name')
                ->get(['id', 'name', 'website_url', 'logo_path']) : [],
        ]);
    }
}
