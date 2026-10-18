import { Link, usePage } from '@inertiajs/react';
import { cn } from '@/lib/utils';
import { taxonomies } from '@/routes/admin/blog';
import { edit as settings } from '@/routes/admin/blog/settings';
import { index as posts } from '@/routes/admin/posts';

const ITEMS = [
    { label: 'Artículos', href: posts.url() },
    { label: 'Categorías y etiquetas', href: taxonomies.url() },
    { label: 'Configuración', href: settings.url() },
];

/** Pestañas de la sección Blog del panel (como BlogNav de sav_3). */
export default function BlogNav() {
    const { url } = usePage();
    const path = url.split('?')[0];
    const active = ITEMS.slice(1).find((item) => path.startsWith(item.href))?.href ?? ITEMS[0].href;

    return (
        <nav aria-label="Blog" className="flex gap-6 overflow-x-auto border-b">
            {ITEMS.map((item) => (
                <Link
                    key={item.href}
                    href={item.href}
                    aria-current={item.href === active ? 'page' : undefined}
                    className={cn(
                        '-mb-px shrink-0 border-b-2 py-3 text-sm font-medium whitespace-nowrap transition',
                        item.href === active ? 'border-brand text-brand' : 'border-transparent text-muted-foreground hover:text-foreground',
                    )}
                >
                    {item.label}
                </Link>
            ))}
        </nav>
    );
}
