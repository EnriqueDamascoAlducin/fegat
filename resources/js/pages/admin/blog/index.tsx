import { Head, Link, router } from '@inertiajs/react';
import { Edit3, ExternalLink, Search, Star, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import BlogNav from '@/components/admin/blog-nav';
import Heading from '@/components/heading';
import { controlClass } from '@/components/site/editor-fields';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { create, destroy, edit, index } from '@/routes/admin/posts';

type State = 'draft' | 'scheduled' | 'published';

type PostRow = {
    id: number;
    title: string;
    slug: string;
    url: string;
    cover_url: string | null;
    state: State;
    is_featured: boolean;
    published_at: string | null;
    author: string;
    category: string | null;
};

type Props = {
    posts: { data: PostRow[]; links: { url: string | null; label: string; active: boolean }[] };
    filters: Record<string, string | undefined>;
    categories: { id: number; name: string }[];
    authors: { id: number; name: string }[];
};

const STATE_LABEL: Record<State, string> = { draft: 'Borrador', scheduled: 'Programado', published: 'Publicado' };
const STATE_CLASS: Record<State, string> = {
    draft: 'bg-zinc-100 text-zinc-700',
    scheduled: 'bg-amber-100 text-amber-800',
    published: 'bg-emerald-100 text-emerald-800',
};

export default function Posts({ posts, filters, categories, authors }: Props) {
    const [search, setSearch] = useState(filters.search ?? '');
    const [status, setStatus] = useState(filters.status ?? '');
    const [category, setCategory] = useState(filters.category_id ?? '');
    const [author, setAuthor] = useState(filters.author_id ?? '');

    useEffect(() => {
        // Sin cambios respecto a lo que cargó el servidor: no recargar, o se pierde ?page.
        if (search === (filters.search ?? '') && status === (filters.status ?? '') && category === (filters.category_id ?? '') && author === (filters.author_id ?? '')) {
            return;
        }

        const id = setTimeout(
            () =>
                router.get(
                    index.url(),
                    { search: search || undefined, status: status || undefined, category_id: category || undefined, author_id: author || undefined },
                    { preserveState: true, replace: true },
                ),
            350,
        );

        return () => clearTimeout(id);
    }, [search, status, category, author, filters]);

    const remove = (post: PostRow) => {
        if (confirm(`¿Eliminar el artículo «${post.title}»?`)) {
            router.delete(destroy.url(post.id), { preserveScroll: true });
        }
    };

    return (
        <>
            <Head title="Blog" />

            <div className="max-w-6xl space-y-6 p-4">
                <div className="flex items-start justify-between gap-4">
                    <Heading title="Blog" description="Artículos, noticias y eventos del sitio público." />
                    <Button asChild>
                        <Link href={create()}>Nuevo artículo</Link>
                    </Button>
                </div>

                <BlogNav />

                <div className="grid gap-3 rounded-2xl border p-4 md:grid-cols-4">
                    <label className="relative">
                        <Search className="absolute top-2.5 left-3 size-4 text-muted-foreground" />
                        <input className={cn(controlClass, 'pl-9')} placeholder="Buscar artículo" value={search} onChange={(event) => setSearch(event.target.value)} />
                    </label>
                    <select className={controlClass} value={status} onChange={(event) => setStatus(event.target.value)} aria-label="Estado">
                        <option value="">Todos los estados</option>
                        <option value="draft">Borradores</option>
                        <option value="scheduled">Programados</option>
                        <option value="published">Publicados</option>
                    </select>
                    <select className={controlClass} value={category} onChange={(event) => setCategory(event.target.value)} aria-label="Categoría">
                        <option value="">Todas las categorías</option>
                        {categories.map((item) => (
                            <option key={item.id} value={item.id}>
                                {item.name}
                            </option>
                        ))}
                    </select>
                    <select className={controlClass} value={author} onChange={(event) => setAuthor(event.target.value)} aria-label="Autor">
                        <option value="">Todos los autores</option>
                        {authors.map((item) => (
                            <option key={item.id} value={item.id}>
                                {item.name}
                            </option>
                        ))}
                    </select>
                </div>

                <div className="overflow-hidden rounded-2xl border">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-muted/50 text-left">
                                <tr>
                                    <th className="px-4 py-3 font-medium">Artículo</th>
                                    <th className="px-4 py-3 font-medium">Categoría</th>
                                    <th className="px-4 py-3 font-medium">Autor</th>
                                    <th className="px-4 py-3 font-medium">Estado</th>
                                    <th className="px-4 py-3 text-right font-medium">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {posts.data.map((post) => (
                                    <tr key={post.id}>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-3">
                                                {post.cover_url ? (
                                                    <img src={post.cover_url} alt="" className="h-12 w-16 shrink-0 rounded object-cover" />
                                                ) : (
                                                    <div className="h-12 w-16 shrink-0 rounded bg-muted" />
                                                )}
                                                <div className="min-w-0">
                                                    <p className="flex items-center gap-1.5 font-medium">
                                                        {post.title}
                                                        {post.is_featured && <Star className="size-4 shrink-0 fill-amber-400 text-amber-400" aria-label="Destacado" />}
                                                    </p>
                                                    <p className="font-mono text-xs text-muted-foreground">{post.url}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">{post.category ?? <span className="text-muted-foreground">Sin categoría</span>}</td>
                                        <td className="px-4 py-3">{post.author}</td>
                                        <td className="px-4 py-3">
                                            <span className={cn('rounded-full px-2.5 py-1 text-xs font-medium', STATE_CLASS[post.state])}>{STATE_LABEL[post.state]}</span>
                                            {post.published_at && post.state !== 'draft' && (
                                                <p className="mt-1 text-xs text-muted-foreground">
                                                    {new Date(post.published_at).toLocaleString('es-MX', { dateStyle: 'medium', timeStyle: 'short' })}
                                                </p>
                                            )}
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex justify-end gap-1">
                                                <Button variant="ghost" size="icon" asChild title="Ver">
                                                    <a href={post.url} target="_blank" rel="noreferrer" aria-label={`Ver ${post.title}`}>
                                                        <ExternalLink className="size-4" />
                                                    </a>
                                                </Button>
                                                <Button variant="ghost" size="icon" asChild title="Editar">
                                                    <Link href={edit(post.id)} aria-label={`Editar ${post.title}`}>
                                                        <Edit3 className="size-4" />
                                                    </Link>
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    title="Eliminar"
                                                    aria-label={`Eliminar ${post.title}`}
                                                    className="text-red-600 hover:bg-red-50"
                                                    onClick={() => remove(post)}
                                                >
                                                    <Trash2 className="size-4" />
                                                </Button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {posts.data.length === 0 && (
                                    <tr>
                                        <td colSpan={5} className="px-4 py-12 text-center text-muted-foreground">
                                            No hay artículos con estos filtros.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {posts.links.length > 3 && (
                    <nav className="flex flex-wrap justify-center gap-1" aria-label="Páginas">
                        {posts.links.map((link, i) => (
                            <button
                                key={i}
                                type="button"
                                disabled={!link.url}
                                onClick={() => link.url && router.get(link.url, {}, { preserveState: true })}
                                className={cn('min-w-9 rounded border px-3 py-2 text-sm disabled:opacity-40', link.active && 'bg-primary text-primary-foreground')}
                                dangerouslySetInnerHTML={{ __html: link.label }}
                            />
                        ))}
                    </nav>
                )}
            </div>
        </>
    );
}

Posts.layout = {
    breadcrumbs: [{ title: 'Blog', href: index() }],
};
