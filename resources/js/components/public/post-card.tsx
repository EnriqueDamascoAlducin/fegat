import { Link } from '@inertiajs/react';
import { show } from '@/routes/blog';

export type PostSummary = {
    id: number;
    title: string;
    slug: string;
    excerpt: string;
    cover_url: string | null;
    date: string | null;
};

export default function PostCard({ post }: { post: PostSummary }) {
    return (
        <Link
            href={show(post.slug)}
            className="group flex h-full flex-col overflow-hidden border-b-[2.4px] border-brand-soft bg-white shadow-[0_0_24px_rgba(0,0,0,0.12)]"
        >
            {post.cover_url ? (
                <img
                    src={post.cover_url}
                    alt=""
                    loading="lazy"
                    className="aspect-video w-full object-cover transition duration-300 group-hover:scale-105"
                />
            ) : (
                <div className="flex aspect-video items-center justify-center bg-brand font-display text-2xl tracking-[0.3em] text-white/80">
                    FEGAT
                </div>
            )}

            <div className="relative flex flex-1 flex-col bg-white p-5">
                {post.date && (
                    <p className="text-sm text-neutral-500">{post.date}</p>
                )}
                <h3 className="mt-1 font-display text-xl leading-snug font-bold text-brand group-hover:underline">
                    {post.title}
                </h3>
                <p className="mt-2 flex-1">{post.excerpt}</p>
                <span className="mt-4 font-semibold text-brand">
                    Leer más →
                </span>
            </div>
        </Link>
    );
}
