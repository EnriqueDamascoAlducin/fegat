import { Head, Link } from '@inertiajs/react';
import PostCard from '@/components/public/post-card';
import type { PostSummary } from '@/components/public/post-card';
import SectionTitle from '@/components/public/section-title';
import PublicLayout from '@/layouts/public-layout';

type Paginated<T> = {
    data: T[];
    current_page: number;
    last_page: number;
    prev_page_url: string | null;
    next_page_url: string | null;
};

const pageLink =
    'rounded-full border-[1.6px] border-brand-soft px-6 py-2 font-display font-medium text-brand transition-colors hover:bg-brand-soft hover:text-white';

export default function BlogIndex({
    posts,
}: {
    posts: Paginated<PostSummary>;
}) {
    return (
        <PublicLayout>
            <Head title="Blog">
                <meta
                    name="description"
                    content="Noticias y artículos de la Federación de Globos Aerostáticos Teotihuacan."
                />
            </Head>

            <main className="px-6 py-16">
                <SectionTitle title="Blog">
                    Noticias y artículos de la federación.
                </SectionTitle>

                {posts.data.length === 0 ? (
                    <p className="mt-12 text-center text-neutral-500">
                        Aún no hay publicaciones.
                    </p>
                ) : (
                    <div className="mx-auto mt-12 grid max-w-6xl gap-8 sm:grid-cols-2 lg:grid-cols-3">
                        {posts.data.map((post) => (
                            <PostCard key={post.id} post={post} />
                        ))}
                    </div>
                )}

                {posts.last_page > 1 && (
                    <nav
                        aria-label="Páginas del blog"
                        className="mt-12 flex items-center justify-center gap-4"
                    >
                        {posts.prev_page_url && (
                            <Link
                                href={posts.prev_page_url}
                                className={pageLink}
                            >
                                ← Más recientes
                            </Link>
                        )}
                        <span className="text-sm text-neutral-500">
                            Página {posts.current_page} de {posts.last_page}
                        </span>
                        {posts.next_page_url && (
                            <Link
                                href={posts.next_page_url}
                                className={pageLink}
                            >
                                Anteriores →
                            </Link>
                        )}
                    </nav>
                )}
            </main>
        </PublicLayout>
    );
}
