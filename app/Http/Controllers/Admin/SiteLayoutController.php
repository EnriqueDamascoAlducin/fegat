<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\HomeContent;
use App\Support\SiteLayout;
use App\Support\SiteLinks;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Header, footer y datos de contacto del sitio público (pestañas de «Sitio público»).
 */
class SiteLayoutController extends Controller
{
    public function edit(): Response
    {
        return Inertia::render('admin/site', [
            'header' => SiteLayout::header(),
            'footer' => SiteLayout::footer(),
            'contact' => HomeContent::current()->only(HomeContent::CONTACT_FIELDS),
            'navOptions' => SiteLinks::options(),
        ]);
    }

    public function updateHeader(Request $request): RedirectResponse
    {
        $request->validate([
            'nav_items' => ['present', 'array', 'max:20'],
            'nav_items.*.label' => ['required', 'string', 'max:80'],
            'nav_items.*.children' => ['array', 'max:20'],
            'nav_items.*.children.*.label' => ['required', 'string', 'max:80'],
            'cta' => ['array'],
        ], [
            'nav_items.*.label.required' => 'Cada opción del menú necesita un texto.',
            'nav_items.*.children.*.label.required' => 'Cada sub-link necesita un texto.',
        ]);

        HomeContent::current()->update(['header' => SiteLayout::cleanHeader($request->all())]);

        return $this->saved('Header guardado.');
    }

    public function updateFooter(Request $request): RedirectResponse
    {
        $request->validate([
            'columns' => ['present', 'array', 'max:6'],
            'columns.*.links' => ['array', 'max:20'],
            'columns.*.links.*.label' => ['required', 'string', 'max:80'],
        ], [
            'columns.*.links.*.label.required' => 'Cada link del footer necesita un texto.',
        ]);

        HomeContent::current()->update(['footer' => SiteLayout::cleanFooter($request->all())]);

        return $this->saved('Footer guardado.');
    }

    public function updateContact(Request $request): RedirectResponse
    {
        $validated = $request->validate([
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

        HomeContent::current()->update(collect(HomeContent::CONTACT_FIELDS)
            ->mapWithKeys(fn (string $field) => [$field => $validated[$field] ?? null])
            ->all());

        return $this->saved('Datos de contacto guardados.');
    }

    private function saved(string $message): RedirectResponse
    {
        Inertia::flash('toast', ['type' => 'success', 'message' => $message]);

        return back();
    }
}
