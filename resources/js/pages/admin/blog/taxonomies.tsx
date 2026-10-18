import { Form, Head, router } from '@inertiajs/react';
import { Edit3, ExternalLink, Plus, Trash2, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import BlogNav from '@/components/admin/blog-nav';
import Heading from '@/components/heading';
import InputError from '@/components/input-error';
import { Field, TextArea, TextInput } from '@/components/site/editor-fields';
import { Button } from '@/components/ui/button';
import { taxonomies } from '@/routes/admin/blog';
import * as categoryRoutes from '@/routes/admin/blog/categories';
import * as tagRoutes from '@/routes/admin/blog/tags';

type Item = {
    id: number;
    name: string;
    slug: string;
    url: string;
    description?: string | null;
    meta_title?: string | null;
    meta_description?: string | null;
    is_active: boolean;
    sort_order?: number;
    posts_count: number;
};

type Kind = 'category' | 'tag';

const slugify = (value: string) =>
    value
        .toLowerCase()
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .replace(/[^a-z0-9\s-]/g, '')
        .trim()
        .replace(/\s+/g, '-');

function Editor({ kind, item, onClose }: { kind: Kind; item?: Item; onClose: () => void }) {
    const routes = kind === 'category' ? categoryRoutes : tagRoutes;
    const [name, setName] = useState(item?.name ?? '');
    const [slug, setSlug] = useState(item?.slug ?? '');

    useEffect(() => {
        const onKey = (event: KeyboardEvent) => event.key === 'Escape' && onClose();
        window.addEventListener('keydown', onKey);

        return () => window.removeEventListener('keydown', onKey);
    }, [onClose]);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4" onClick={onClose}>
            <Form
                {...(item ? routes.update.form(item.id) : routes.store.form())}
                options={{ preserveScroll: true }}
                onSuccess={onClose}
                className="max-h-[90vh] w-full max-w-xl space-y-4 overflow-y-auto rounded-2xl bg-background p-5 shadow-xl"
                onClick={(event) => event.stopPropagation()}
                role="dialog"
                aria-modal="true"
                aria-label={`${item ? 'Editar' : 'Nueva'} ${kind === 'category' ? 'categoría' : 'etiqueta'}`}
            >
                {({ processing, errors }) => (
                    <>
                        <div className="flex items-center justify-between">
                            <h2 className="text-lg font-semibold">
                                {item ? 'Editar' : 'Nueva'} {kind === 'category' ? 'categoría' : 'etiqueta'}
                            </h2>
                            <button type="button" onClick={onClose} aria-label="Cerrar">
                                <X className="size-5" />
                            </button>
                        </div>
                        <Field label="Nombre">
                            <TextInput
                                name="name"
                                required
                                maxLength={120}
                                autoFocus
                                value={name}
                                onChange={(event) => {
                                    setName(event.target.value);

                                    if (!item) {
                                        setSlug(slugify(event.target.value));
                                    }
                                }}
                            />
                            <InputError message={errors.name} />
                        </Field>
                        <Field label="Dirección" hint={`/blog/${kind === 'category' ? 'categoria' : 'etiqueta'}/${slug || '…'}`}>
                            <TextInput name="slug" maxLength={120} value={slug} onChange={(event) => setSlug(slugify(event.target.value))} />
                            <InputError message={errors.slug} />
                        </Field>
                        {kind === 'category' && (
                            <>
                                <Field label="Descripción" hint="Aparece en la página de la categoría.">
                                    <TextArea name="description" rows={3} maxLength={2000} defaultValue={item?.description ?? ''} />
                                </Field>
                                <Field label="Título en Google">
                                    <TextInput name="meta_title" maxLength={255} defaultValue={item?.meta_title ?? ''} />
                                </Field>
                                <Field label="Descripción en Google">
                                    <TextArea name="meta_description" rows={2} maxLength={500} defaultValue={item?.meta_description ?? ''} />
                                </Field>
                                <Field label="Orden" hint="Las categorías se muestran de menor a mayor.">
                                    <TextInput type="number" name="sort_order" min={0} max={9999} defaultValue={item?.sort_order ?? 0} />
                                </Field>
                            </>
                        )}
                        <label className="flex items-center gap-2 text-sm">
                            <input type="checkbox" name="is_active" value="1" defaultChecked={item?.is_active ?? true} className="size-4 accent-brand" />
                            Activa (visible en el blog)
                        </label>
                        <div className="flex justify-end gap-2">
                            <Button type="button" variant="outline" onClick={onClose}>
                                Cancelar
                            </Button>
                            <Button disabled={processing}>Guardar</Button>
                        </div>
                    </>
                )}
            </Form>
        </div>
    );
}

function List({ title, kind, items, onEdit, onCreate }: { title: string; kind: Kind; items: Item[]; onEdit: (item: Item) => void; onCreate: () => void }) {
    const remove = (item: Item) => {
        const routes = kind === 'category' ? categoryRoutes : tagRoutes;
        const extra = item.posts_count > 0 ? ` Está en ${item.posts_count} artículo(s); se les quitará.` : '';

        if (confirm(`¿Eliminar «${item.name}»?${extra}`)) {
            router.delete(routes.destroy.url(item.id), { preserveScroll: true });
        }
    };

    return (
        <section className="space-y-4 rounded-2xl border p-5">
            <div className="flex items-center justify-between gap-3">
                <h2 className="font-medium">{title}</h2>
                <Button size="sm" onClick={onCreate}>
                    <Plus className="size-4" /> Agregar
                </Button>
            </div>
            <div className="divide-y rounded-xl border">
                {items.map((item) => (
                    <div key={item.id} className="flex items-center justify-between gap-3 p-3">
                        <div className="min-w-0">
                            <p className="font-medium">{item.name}</p>
                            <p className="text-xs text-muted-foreground">
                                <span className="font-mono">{item.url}</span> · {item.posts_count} artículos · {item.is_active ? 'Activa' : 'Inactiva'}
                            </p>
                        </div>
                        <div className="flex shrink-0">
                            <Button variant="ghost" size="icon" asChild title="Ver">
                                <a href={item.url} target="_blank" rel="noreferrer" aria-label={`Ver ${item.name}`}>
                                    <ExternalLink className="size-4" />
                                </a>
                            </Button>
                            <Button variant="ghost" size="icon" title="Editar" aria-label={`Editar ${item.name}`} onClick={() => onEdit(item)}>
                                <Edit3 className="size-4" />
                            </Button>
                            <Button
                                variant="ghost"
                                size="icon"
                                title="Eliminar"
                                aria-label={`Eliminar ${item.name}`}
                                className="text-red-600 hover:bg-red-50"
                                onClick={() => remove(item)}
                            >
                                <Trash2 className="size-4" />
                            </Button>
                        </div>
                    </div>
                ))}
                {items.length === 0 && <p className="p-6 text-center text-sm text-muted-foreground">Sin elementos.</p>}
            </div>
        </section>
    );
}

export default function Taxonomies({ categories, tags }: { categories: Item[]; tags: Item[] }) {
    const [editing, setEditing] = useState<{ kind: Kind; item?: Item } | null>(null);

    return (
        <>
            <Head title="Categorías y etiquetas" />

            <div className="max-w-6xl space-y-6 p-4">
                <Heading title="Blog" description="Organiza los artículos y sus páginas de archivo." />
                <BlogNav />
                <div className="grid gap-6 lg:grid-cols-2">
                    <List
                        title="Categorías"
                        kind="category"
                        items={categories}
                        onCreate={() => setEditing({ kind: 'category' })}
                        onEdit={(item) => setEditing({ kind: 'category', item })}
                    />
                    <List title="Etiquetas" kind="tag" items={tags} onCreate={() => setEditing({ kind: 'tag' })} onEdit={(item) => setEditing({ kind: 'tag', item })} />
                </div>
            </div>

            {editing && <Editor key={`${editing.kind}-${editing.item?.id ?? 'new'}`} {...editing} onClose={() => setEditing(null)} />}
        </>
    );
}

Taxonomies.layout = {
    breadcrumbs: [{ title: 'Blog', href: taxonomies() }],
};
