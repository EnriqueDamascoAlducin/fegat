<?php

namespace App\Http\Controllers;

use App\Models\Post;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class BlogController extends Controller
{
    public function index(): Response
    {
        return Inertia::render('blog/index', [
            'posts' => Post::query()
                ->published()
                ->latest('published_at')
                ->paginate(9)
                ->through(fn (Post $post) => $post->toCard()),
        ]);
    }

    /**
     * Los borradores solo los puede abrir el super admin, como vista previa.
     */
    public function show(Request $request, Post $post): Response
    {
        abort_unless($post->isPublished() || $request->user()?->isSuperAdmin() === true, 404);

        return Inertia::render('blog/show', [
            'post' => [
                ...$post->toCard(),
                'body' => $post->body,
                'is_draft' => ! $post->isPublished(),
            ],
        ]);
    }
}
