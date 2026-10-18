import { Head, Link, router } from '@inertiajs/react';
import { ArrowRight, Rss, Search } from 'lucide-react';
import { useState } from 'react';
import type { FormEvent } from 'react';
import PostCard, { Byline } from '@/components/public/post-card';
import type { PostSummary } from '@/components/public/post-card';
import PublicLayout from '@/layouts/public-layout';
import { cn } from '@/lib/utils';
import { feed, index as blogIndex } from '@/routes/blog';

type Taxonomy = { id: number; name: string; url: string };

type Props = {
    heading: { title: string; description: string; eyebrow: string | null };
    heroUrl: string | null;
    featured: PostSummary | null;
    posts: { data: PostSummary[]; links: { url: string | null; label: string; active: boolean }[] };
    categories: Taxonomy[];
    tags: Taxonomy[];
    activeCategory: number | null;
    query: string;
    seo: { title: string; description: string; robots: string | null };
};

function Masthead({ heading, heroUrl }: { heading: Props['heading']; heroUrl: string | null }) {
    if (heroUrl) {
        return (
            <header className="relative isolate min-h-[300px] overflow-hidden bg-zinc-950 text-white sm:min-h-[390px]">
                <img src={heroUrl} alt="" className="absolute inset-0 -z-20 h-full w-full object-cover" />
                <div className="absolute inset-0 -z-10 bg-black/55" />
                <div className="mx-auto flex min-h-[300px] max-w-6xl items-end px-4 py-10 sm:min-h-[390px] sm:px-6 sm:py-14 lg:px-8">
                    <div className="max-w-3xl">
                        <h1 className="font-display text-4xl leading-[1.05] font-semibold sm:text-6xl">{heading.title}</h1>
                        {heading.description && <p className="mt-4 max-w-2xl text-base leading-7 text-white/80 sm:text-lg">{heading.description}</p>}
                    </div>
                </div>
            </header>
        );
    }

    return (
        <header className="border-b border-zinc-200 bg-white">
            <div className="mx-auto grid max-w-6xl gap-5 px-4 py-10 sm:px-6 sm:py-14 lg:grid-cols-[1fr_420px] lg:items-end lg:px-8">
                <div>
                    {heading.eyebrow && <p className="mb-3 text-[11px] font-semibold tracking-[0.1em] text-brand uppercase">{heading.eyebrow}</p>}
                    <h1 className="max-w-3xl font-display text-4xl leading-[1.05] font-semibold text-zinc-950 sm:text-6xl">{heading.title}</h1>
                </div>
                {heading.description && <p className="max-w-xl text-[15px] leading-7 text-zinc-600 lg:pb-1">{heading.description}</p>}
            </div>
        </header>
    );
}

export default function BlogIndex({ heading, heroUrl, featured, posts, categories, tags, activeCategory, query, seo }: Props) {
    const [q, setQ] = useState(query ?? '');

    const search = (event: FormEvent) => {
        event.preventDefault();
        router.get(window.location.pathname, { q: q || undefined }, { preserveState: true });
    };

    const tabClass = (active: boolean) =>
        cn(
            'shrink-0 border-b-2 py-4 text-sm font-medium whitespace-nowrap transition',
            active ? 'border-brand text-brand' : 'border-transparent text-zinc-500 hover:text-zinc-950',
        );

    return (
        <PublicLayout>
            <Head title={seo.title}>
                {seo.description && <meta name="description" content={seo.description} />}
                {seo.robots && <meta name="robots" content={seo.robots} />}
                <link rel="alternate" type="application/rss+xml" title="Blog FEGAT" href={feed.url()} />
            </Head>

            <div className="bg-white text-zinc-950">
                <Masthead heading={heading} heroUrl={heroUrl} />

                <div className="border-b border-zinc-200 bg-white">
                    <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 sm:px-6 md:flex-row md:items-center md:justify-between lg:px-8">
                        <nav aria-label="Categorías" className="flex min-w-0 gap-7 overflow-x-auto">
                            <Link href={blogIndex()} className={tabClass(activeCategory === null && !heading.eyebrow)}>
                                Todo
                            </Link>
                            {categories.map((category) => (
                                <Link key={category.id} href={category.url} className={tabClass(category.id === activeCategory)}>
                                    {category.name}
                                </Link>
                            ))}
                        </nav>
                        <form onSubmit={search} role="search" className="relative mb-3 w-full md:mb-0 md:w-64">
                            <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-zinc-400" />
                            <input
                                value={q}
                                onChange={(event) => setQ(event.target.value)}
                                placeholder="Buscar en el blog"
                                aria-label="Buscar en el blog"
                                className="h-10 w-full border-b border-zinc-300 bg-transparent pr-3 pl-9 text-sm text-zinc-900 outline-none placeholder:text-zinc-400 focus:border-brand"
                            />
                        </form>
                    </div>
                </div>

                <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
                    {featured && (
                        <article className="group mb-14 border-b border-zinc-200 pb-14">
                            <Link href={featured.url} className="grid gap-7 lg:grid-cols-[1.35fr_1fr] lg:items-center lg:gap-12">
                                <div className="aspect-[16/10] overflow-hidden bg-zinc-100">
                                    {featured.cover_url && (
                                        <img
                                            src={featured.cover_url}
                                            alt={featured.title}
                                            className="h-full w-full object-cover transition duration-700 group-hover:scale-[1.02]"
                                        />
                                    )}
                                </div>
                                <div>
                                    <p className="text-[11px] font-semibold tracking-[0.1em] text-brand uppercase">
                                        Destacado{featured.category ? ` · ${featured.category}` : ''}
                                    </p>
                                    <h2 className="mt-3 font-display text-3xl leading-tight font-semibold text-zinc-950 transition-colors group-hover:text-brand sm:text-4xl">
                                        {featured.title}
                                    </h2>
                                    {featured.excerpt && <p className="mt-4 text-[15px] leading-7 text-zinc-600">{featured.excerpt}</p>}
                                    <div className="mt-7 flex items-center justify-between gap-4 border-t border-zinc-200 pt-5">
                                        <Byline post={featured} />
                                        <span className="inline-flex shrink-0 items-center gap-2 text-sm font-medium text-zinc-900">
                                            Leer artículo
                                            <ArrowRight className="size-4 transition group-hover:translate-x-1" />
                                        </span>
                                    </div>
                                </div>
                            </Link>
                        </article>
                    )}

                    <div className="grid gap-x-8 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
                        {posts.data.map((post) => (
                            <PostCard key={post.id} post={post} />
                        ))}
                    </div>

                    {posts.data.length === 0 && !featured && (
                        <div className="border-y border-zinc-200 py-20 text-center">
                            <h2 className="font-display text-2xl font-semibold text-zinc-950">{query ? 'Sin resultados' : 'Aún no hay artículos'}</h2>
                            <p className="mt-2 text-zinc-600">{query ? `No encontramos artículos para «${query}».` : 'Vuelve pronto para leer las novedades de la federación.'}</p>
                        </div>
                    )}

                    {posts.links.length > 3 && (
                        <nav className="mt-14 flex flex-wrap justify-center gap-1.5" aria-label="Páginas del blog">
                            {posts.links.map((link, index) => (
                                <button
                                    key={index}
                                    type="button"
                                    disabled={!link.url}
                                    onClick={() => link.url && router.get(link.url)}
                                    aria-current={link.active ? 'page' : undefined}
                                    className={cn(
                                        'min-w-10 border px-3.5 py-2 text-sm font-medium transition disabled:opacity-40',
                                        link.active ? 'border-brand bg-brand text-white' : 'border-zinc-300 bg-white text-zinc-600 hover:border-brand hover:text-brand',
                                    )}
                                    dangerouslySetInnerHTML={{ __html: link.label }}
                                />
                            ))}
                        </nav>
                    )}

                    {tags.length > 0 && (
                        <section className="mt-16 border-t border-zinc-200 pt-7">
                            <p className="mb-4 text-[11px] font-semibold tracking-[0.1em] text-zinc-500 uppercase">Explorar temas</p>
                            <div className="flex flex-wrap gap-2">
                                {tags.map((tag) => (
                                    <Link
                                        key={tag.id}
                                        href={tag.url}
                                        className="rounded-full border border-zinc-300 px-3.5 py-1.5 text-sm text-zinc-600 transition hover:border-brand hover:text-brand"
                                    >
                                        {tag.name}
                                    </Link>
                                ))}
                            </div>
                        </section>
                    )}

                    <p className="mt-12 text-center">
                        <a href={feed.url()} className="inline-flex items-center gap-2 text-sm text-zinc-500 hover:text-brand">
                            <Rss className="size-4" /> Suscríbete por RSS
                        </a>
                    </p>
                </main>
            </div>
        </PublicLayout>
    );
}
