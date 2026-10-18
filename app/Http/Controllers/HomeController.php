<?php

namespace App\Http\Controllers;

use App\Models\Page;
use App\Support\PageRenderer;
use Inertia\Response;

class HomeController extends Controller
{
    /**
     * Página de inicio, armada por bloques desde «Páginas» del panel.
     */
    public function __invoke(PageRenderer $renderer): Response
    {
        $page = Page::home();

        abort_unless($page !== null, 404);

        return $renderer->render($page);
    }
}
