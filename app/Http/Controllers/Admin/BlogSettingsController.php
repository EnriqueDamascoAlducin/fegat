<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\HomeContent;
use App\Support\BlogSettings;
use App\Support\SiteLinks;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Presentación del índice del blog y CTA de los artículos (port de BlogSettingsController de sav_3).
 */
class BlogSettingsController extends Controller
{
    public function edit(): Response
    {
        return Inertia::render('admin/blog/settings', [
            'config' => BlogSettings::get(),
            'navOptions' => SiteLinks::options(),
        ]);
    }

    public function update(Request $request): RedirectResponse
    {
        $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'subtitle' => ['nullable', 'string', 'max:1000'],
            'posts_per_page' => ['required', 'integer', 'min:3', 'max:48'],
            'related_count' => ['required', 'integer', 'min:0', 'max:6'],
            'cta' => ['array'],
            'cta.title' => ['nullable', 'string', 'max:255'],
            'cta.label' => ['nullable', 'string', 'max:100'],
        ]);

        HomeContent::current()->update(['blog' => BlogSettings::clean($request->all())]);

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Configuración del blog guardada.']);

        return back();
    }
}
