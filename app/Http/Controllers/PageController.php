<?php

namespace App\Http\Controllers;

use App\Models\Page;
use App\Support\PageRenderer;
use Illuminate\Http\Request;
use Inertia\Response;

class PageController extends Controller
{
    /**
     * Ruta comodín al final de todas: cualquier dirección de un solo nivel que no atienda otra
     * ruta se busca como página. Las inactivas solo las ve el super admin, como vista previa.
     */
    public function __invoke(Request $request, PageRenderer $renderer, string $slug): Response
    {
        $page = preg_match('/^[a-z0-9]+(?:-[a-z0-9]+)*$/', $slug)
            ? Page::query()->where('is_home', false)->where('slug', $slug)->first()
            : null;

        abort_unless($page && ($page->is_active || $request->user()?->isSuperAdmin() === true), 404);

        return $renderer->render($page);
    }
}
