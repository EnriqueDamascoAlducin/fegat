import { Head, Link } from '@inertiajs/react';
import { ArrowLeft, ArrowRight, Calendar, Clock } from 'lucide-react';
import PostCard, { Avatar } from '@/components/public/post-card';
import type { PostSummary } from '@/components/public/post-card';
import PublicLayout from '@/layouts/public-layout';
import { index } from '@/routes/blog';
import type { SiteLink } from '@/types/site';

type Post = PostSummary & {
    body: string;
    cover_alt: string | null;
    is_draft: boolean;
    state: 'draft' | 'scheduled' | 'published';
    tags: { name: string; url: string }[];
};

type Props = {
    post: Post;
    related: PostSummary[];
    cta: (SiteLink & { title: string; label: string }) | null;
    seo: {
        title: string;
        description: string;
        keywords: string | null;
        og_title: string;
        og_description: string;
        image: string | null;
        canonical: string;
        published_at: string | null;
        modified_at: string | null;
    };
};

function ArticleMeta({ post }: { post: Post }) {
    return (
        <div className="flex items-center gap-3">
            <Avatar name={post.author} size={40} />
            <div className="min-w-0">
                <p className="truncate text-sm font-medium text-zinc-950">{post.author}</p>
                <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-zinc-500">
                    {post.date && (
                        <span className="inline-flex items-center gap-1.5">
                            <Calendar className="size-3.5" />
                            {post.date}
                        </span>
                    )}
                    <span className="inline-flex items-center gap-1.5">
                        <Clock className="size-3.5" />
                        {post.read_time} min de lectura
                    </span>
                </div>
            </div>
        </div>
    );
}

export default function BlogShow({ post, related, cta, seo }: Props) {
    const jsonLd = {
        '@context': 'https://schema.org',
        '@type': 'Article',
        headline: post.title,
        description: seo.description,
        image: seo.image ?? undefined,
        datePublished: seo.published_at ?? undefined,
        dateModified: seo.modified_at ?? undefined,
        author: { '@type': post.author === 'Equipo FEGAT' ? 'Organization' : 'Person', name: post.author },
        mainEntityOfPage: seo.canonical,
    };

    return (
        <PublicLayout>
            <Head title={seo.title}>
                {seo.description && <meta name="description" content={seo.description} />}
                {seo.keywords && <meta name="keywords" content={seo.keywords} />}
                <link rel="canonical" href={seo.canonical} />
                <meta property="og:type" content="article" />
                <meta property="og:title" content={seo.og_title} />
                {seo.og_description && <meta property="og:description" content={seo.og_description} />}
                {seo.image && <meta property="og:image" content={seo.image} />}
                {post.is_draft && <meta name="robots" content="noindex" />}
            </Head>

            {!post.is_draft && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />}

            <article className="bg-white text-zinc-950">
                <header className="border-b border-zinc-200">
                    <div className="mx-auto max-w-6xl px-4 py-9 sm:px-6 sm:py-12 lg:px-8">
                        <Link href={index()} className="inline-flex items-center gap-2 text-sm font-medium text-zinc-600 transition hover:text-zinc-950">
                            <ArrowLeft className="size-4" />
                            Volver al blog
                        </Link>

                        {post.is_draft && (
                            <p className="mt-6 rounded border border-amber-400 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                                {post.state === 'scheduled'
                                    ? `Programado para el ${post.date}: solo tú puedes verlo hasta entonces.`
                                    : 'Borrador: solo tú puedes ver esta página hasta que la publiques.'}
                            </p>
                        )}

                        <div className="mt-8 grid gap-8 border-t border-zinc-200 pt-8 lg:grid-cols-[minmax(0,1fr)_240px] lg:gap-14">
                            <div>
                                {post.category &&
                                    (post.category_url ? (
                                        <Link href={post.category_url} className="text-[11px] font-semibold tracking-[0.1em] text-brand uppercase hover:underline">
                                            {post.category}
                                        </Link>
                                    ) : (
                                        <p className="text-[11px] font-semibold tracking-[0.1em] text-brand uppercase">{post.category}</p>
                                    ))}
                                <h1 className="mt-3 max-w-4xl font-display text-4xl leading-[1.05] font-semibold text-balance text-zinc-950 sm:text-5xl lg:text-[3.4rem]">
                                    {post.title}
                                </h1>
                                {post.excerpt && <p className="mt-5 max-w-3xl text-lg leading-8 text-zinc-600">{post.excerpt}</p>}
                            </div>

                            <aside className="border-t border-zinc-200 pt-5 lg:border-t-0 lg:border-l lg:pt-1 lg:pl-7">
                                <ArticleMeta post={post} />
                            </aside>
                        </div>
                    </div>
                </header>

                {post.cover_url && (
                    <figure className="mx-auto max-w-6xl px-4 pt-8 sm:px-6 sm:pt-10 lg:px-8">
                        <img src={post.cover_url} alt={post.cover_alt || post.title} className="aspect-[16/9] w-full object-cover" />
                    </figure>
                )}

                <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
                    {/* El servidor sanea este HTML al guardarlo (App\Support\RichText). */}
                    <div className="custom-page-rich text-lg leading-8 text-zinc-800 [--cp-primary:var(--color-brand)] [--cp-secondary:var(--color-brand-soft)]" dangerouslySetInnerHTML={{ __html: post.body }} />

                    {post.tags.length > 0 && (
                        <div className="mt-14 border-t border-zinc-200 pt-7">
                            <p className="mb-3 text-[11px] font-semibold tracking-[0.1em] text-zinc-500 uppercase">Temas</p>
                            <div className="flex flex-wrap gap-2">
                                {post.tags.map((tag) => (
                                    <Link
                                        key={tag.url}
                                        href={tag.url}
                                        className="rounded-full border border-zinc-300 px-3.5 py-1.5 text-sm text-zinc-600 transition hover:border-brand hover:text-brand"
                                    >
                                        {tag.name}
                                    </Link>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </article>

            {cta && (
                <section className="bg-brand text-white">
                    <div className="mx-auto flex max-w-6xl flex-col gap-7 px-4 py-14 sm:px-6 md:flex-row md:items-center md:justify-between lg:px-8">
                        <h2 className="max-w-3xl font-display text-3xl leading-tight font-semibold sm:text-4xl">{cta.title}</h2>
                        <a
                            href={cta.url}
                            target={cta.open_in_new_tab ? '_blank' : undefined}
                            rel={cta.open_in_new_tab ? 'noopener noreferrer' : undefined}
                            className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-full bg-white px-6 text-sm font-semibold text-brand transition hover:bg-brand-soft hover:text-white"
                        >
                            {cta.label}
                            <ArrowRight className="size-4" />
                        </a>
                    </div>
                </section>
            )}

            {related.length > 0 && (
                <section className="border-t border-zinc-200 bg-white">
                    <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-16 lg:px-8">
                        <h2 className="mb-8 font-display text-3xl font-semibold text-zinc-950">Artículos relacionados</h2>
                        <div className="grid gap-x-8 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
                            {related.map((item) => (
                                <PostCard key={item.id} post={item} />
                            ))}
                        </div>
                    </div>
                </section>
            )}
        </PublicLayout>
    );
}
