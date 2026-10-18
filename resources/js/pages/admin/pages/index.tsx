import { Head, Link, router } from '@inertiajs/react';
import { Home } from 'lucide-react';
import Heading from '@/components/heading';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { destroy, edit, index, makeHome, store } from '@/routes/admin/pages';

type PageRow = {
    id: number;
    title: string;
    url: string;
    is_home: boolean;
    is_active: boolean;
    blocks_count: number;
    updated_at: string | null;
};

export default function Pages({ pages }: { pages: PageRow[] }) {
    const remove = (page: PageRow) => {
        if (confirm(`¿Eliminar la página «${page.title}»? Los enlaces del menú que apunten a ella dejarán de funcionar.`)) {
            router.delete(destroy.url(page.id), { preserveScroll: true });
        }
    };

    const setHome = (page: PageRow) => {
        if (confirm(`¿Usar «${page.title}» como página de inicio?`)) {
            router.post(makeHome.url(page.id), {}, { preserveScroll: true });
        }
    };

    return (
        <>
            <Head title="Páginas" />

            <div className="max-w-5xl space-y-6 p-4">
                <div className="flex items-start justify-between gap-4">
                    <Heading
                        title="Páginas"
                        description="Páginas del sitio público, armadas por bloques. El menú y el footer se configuran en Sitio público."
                    />
                    <Button onClick={() => router.post(store.url())}>Nueva página</Button>
                </div>

                <ul className="divide-y rounded-2xl border bg-card">
                    {pages.map((page) => (
                        <li key={page.id} className="flex flex-wrap items-center gap-3 p-4">
                            <div className="min-w-0 flex-1">
                                <p className="flex items-center gap-2 font-medium">
                                    {page.is_home && <Home className="size-4 text-brand" aria-label="Inicio" />}
                                    {page.title}
                                    <span
                                        className={cn(
                                            'rounded-full px-2 py-0.5 text-xs font-medium',
                                            page.is_active ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800',
                                        )}
                                    >
                                        {page.is_active ? 'Publicada' : 'Borrador'}
                                    </span>
                                </p>
                                <p className="text-sm text-muted-foreground">
                                    <span className="font-mono">{page.url}</span> · {page.blocks_count} bloques
                                    {page.updated_at && ` · editada ${page.updated_at}`}
                                </p>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                <Button variant="outline" size="sm" asChild>
                                    <Link href={edit(page.id)}>Editar</Link>
                                </Button>
                                <Button variant="ghost" size="sm" asChild>
                                    <a href={page.url} target="_blank" rel="noreferrer">
                                        Ver
                                    </a>
                                </Button>
                                {!page.is_home && (
                                    <>
                                        <Button variant="ghost" size="sm" onClick={() => setHome(page)}>
                                            Usar como inicio
                                        </Button>
                                        <Button variant="destructive" size="sm" onClick={() => remove(page)}>
                                            Eliminar
                                        </Button>
                                    </>
                                )}
                            </div>
                        </li>
                    ))}
                </ul>
            </div>
        </>
    );
}

Pages.layout = {
    breadcrumbs: [{ title: 'Páginas', href: index() }],
};
