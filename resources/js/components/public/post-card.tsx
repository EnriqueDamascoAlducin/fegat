import { Link } from '@inertiajs/react';
import { cn } from '@/lib/utils';

/** Tarjeta de artículo que manda el servidor (Post::toCard). */
export type PostSummary = {
    id: number;
    title: string;
    slug: string;
    url: string;
    excerpt: string;
    cover_url: string | null;
    date: string | null;
    category: string | null;
    category_url: string | null;
    author: string;
    read_time: number;
};

function initials(name: string) {
    return name
        .split(' ')
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase() ?? '')
        .join('');
}

export function Avatar({ name, size = 34 }: { name: string; size?: number }) {
    return (
        <span
            className="flex shrink-0 items-center justify-center rounded-full bg-brand/10 text-[11px] font-semibold text-brand"
            style={{ height: size, width: size }}
            aria-hidden="true"
        >
            {initials(name) || '•'}
        </span>
    );
}

export function Byline({ post, light = false }: { post: PostSummary; light?: boolean }) {
    const meta = [post.date, `${post.read_time} min de lectura`].filter(Boolean).join(' · ');

    return (
        <div className="flex min-w-0 items-center gap-3">
            <Avatar name={post.author} />
            <div className="min-w-0">
                <p className={cn('truncate text-[13px] font-medium', light ? 'text-white' : 'text-zinc-900')}>{post.author}</p>
                <p className={cn('text-[12px]', light ? 'text-white/65' : 'text-zinc-500')}>{meta}</p>
            </div>
        </div>
    );
}

export default function PostCard({ post }: { post: PostSummary }) {
    return (
        <article className="group border-t border-zinc-200 pt-5 text-left">
            <Link href={post.url} className="block">
                <div className="aspect-[3/2] overflow-hidden bg-zinc-100">
                    {post.cover_url ? (
                        <img
                            src={post.cover_url}
                            alt={post.title}
                            loading="lazy"
                            className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.02]"
                        />
                    ) : (
                        <div className="flex h-full w-full items-center justify-center bg-brand font-display text-2xl tracking-[0.3em] text-white/80">
                            FEGAT
                        </div>
                    )}
                </div>
                <div className="pt-5">
                    {post.category && <p className="mb-2 text-[11px] font-semibold tracking-[0.08em] text-brand uppercase">{post.category}</p>}
                    <h3 className="font-display text-[1.35rem] leading-snug font-semibold text-zinc-950 transition-colors group-hover:text-brand">
                        {post.title}
                    </h3>
                    {post.excerpt && <p className="mt-2 line-clamp-3 text-[14px] leading-6 text-zinc-600">{post.excerpt}</p>}
                </div>
            </Link>
            <div className="mt-5">
                <Byline post={post} />
            </div>
        </article>
    );
}
