import { Head, Link } from '@inertiajs/react';
import type { PostSummary } from '@/components/public/post-card';
import PublicLayout from '@/layouts/public-layout';
import { index } from '@/routes/blog';

type Post = PostSummary & {
    body: string;
    is_draft: boolean;
};

export default function BlogShow({
    post,
    showSemaphore,
}: {
    post: Post;
    showSemaphore: boolean;
}) {
    return (
        <PublicLayout showSemaphore={showSemaphore} showBlog>
            <Head title={post.title}>
                <meta name="description" content={post.excerpt} />
            </Head>

            <main className="px-6 py-12">
                <article className="mx-auto max-w-3xl">
                    <Link
                        href={index()}
                        className="font-semibold text-brand hover:underline"
                    >
                        ← Blog
                    </Link>

                    {post.is_draft && (
                        <p className="mt-6 rounded border border-amber-400 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                            Borrador: solo tú puedes ver esta página hasta que
                            la publiques.
                        </p>
                    )}

                    <h1 className="mt-6 font-display text-4xl leading-tight font-bold text-balance text-brand sm:text-5xl">
                        {post.title}
                    </h1>
                    {post.date && (
                        <p className="mt-3 text-neutral-500">{post.date}</p>
                    )}

                    {post.cover_url && (
                        <img
                            src={post.cover_url}
                            alt=""
                            className="mt-8 w-full rounded-lg object-cover shadow-[0_0_24px_rgba(0,0,0,0.12)]"
                        />
                    )}

                    {/* El servidor sanea este HTML al guardarlo (App\Support\RichText). */}
                    <div
                        className="rich-text mt-8 text-lg leading-relaxed [&_a]:text-brand [&_h2]:text-brand [&_h3]:text-brand [&_h4]:text-brand"
                        dangerouslySetInnerHTML={{ __html: post.body }}
                    />
                </article>
            </main>
        </PublicLayout>
    );
}
