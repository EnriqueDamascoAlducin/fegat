import { Head, Link, router } from '@inertiajs/react';
import Heading from '@/components/heading';
import type { PostSummary } from '@/components/public/post-card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { create, destroy, edit, index } from '@/routes/admin/posts';
import { show } from '@/routes/blog';

type PostRow = PostSummary & {
    is_published: boolean;
};

export default function Posts({ posts }: { posts: PostRow[] }) {
    const remove = (post: PostRow) => {
        if (confirm(`¿Eliminar la publicación «${post.title}»?`)) {
            router.delete(destroy.url(post.id), { preserveScroll: true });
        }
    };

    return (
        <>
            <Head title="Blog" />

            <div className="max-w-6xl space-y-6 p-4">
                <div className="flex items-start justify-between gap-4">
                    <Heading
                        title="Blog"
                        description="Publicaciones del sitio público. Los borradores solo los ves tú."
                    />
                    <Button asChild>
                        <Link href={create()}>Nueva publicación</Link>
                    </Button>
                </div>

                {posts.length === 0 ? (
                    <p className="rounded-2xl border p-6 text-sm text-muted-foreground">
                        Aún no hay publicaciones.
                    </p>
                ) : (
                    <ul className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                        {posts.map((post) => (
                            <li
                                key={post.id}
                                className="flex flex-col overflow-hidden rounded-2xl border bg-card text-card-foreground"
                            >
                                <div className="relative">
                                    {post.cover_url ? (
                                        <img
                                            src={post.cover_url}
                                            alt=""
                                            loading="lazy"
                                            className="aspect-video w-full object-cover"
                                        />
                                    ) : (
                                        <div className="flex aspect-video items-center justify-center bg-muted text-sm text-muted-foreground">
                                            Sin portada
                                        </div>
                                    )}
                                    <span
                                        className={cn(
                                            'absolute top-3 left-3 rounded-full px-2.5 py-0.5 text-xs font-medium shadow',
                                            post.is_published
                                                ? 'bg-emerald-600 text-white'
                                                : 'bg-amber-400 text-neutral-900',
                                        )}
                                    >
                                        {post.is_published
                                            ? 'Publicada'
                                            : 'Borrador'}
                                    </span>
                                </div>

                                <div className="flex flex-1 flex-col p-4">
                                    <p className="text-xs text-muted-foreground">
                                        {post.date ?? 'Sin publicar'}
                                    </p>
                                    <h3 className="mt-1 line-clamp-2 leading-snug font-semibold">
                                        {post.title}
                                    </h3>
                                    <p className="mt-2 line-clamp-3 flex-1 text-sm text-muted-foreground">
                                        {post.excerpt}
                                    </p>

                                    <div className="mt-4 flex flex-wrap gap-2">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            asChild
                                        >
                                            <Link href={edit(post.id)}>
                                                Editar
                                            </Link>
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            asChild
                                        >
                                            <a
                                                href={show.url(post.slug)}
                                                target="_blank"
                                                rel="noreferrer"
                                            >
                                                Ver
                                            </a>
                                        </Button>
                                        <Button
                                            variant="destructive"
                                            size="sm"
                                            className="ml-auto"
                                            onClick={() => remove(post)}
                                        >
                                            Eliminar
                                        </Button>
                                    </div>
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </>
    );
}

Posts.layout = {
    breadcrumbs: [
        {
            title: 'Blog',
            href: index(),
        },
    ],
};
