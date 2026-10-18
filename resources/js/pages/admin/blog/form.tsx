import { Form, Head, Link } from '@inertiajs/react';
import { ArrowLeft, ExternalLink, Save } from 'lucide-react';
import { useState } from 'react';
import type { ReactNode } from 'react';
import BlogNav from '@/components/admin/blog-nav';
import InputError from '@/components/input-error';
import RichTextEditor from '@/components/rich-text-editor';
import { Field, TextArea, TextInput, controlClass } from '@/components/site/editor-fields';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { image, index, store, update } from '@/routes/admin/posts';

type Option = { id: number; name: string };

type PostData = {
    id: number | null;
    title: string;
    slug: string;
    excerpt: string;
    body: string;
    cover_url: string | null;
    cover_alt: string;
    user_id: number | null;
    category_id: number | null;
    tag_ids: number[];
    status: 'draft' | 'published';
    published_at: string | null;
    is_featured: boolean;
    url: string | null;
    meta_title: string;
    meta_description: string;
    meta_keywords: string;
    og_title: string;
    og_description: string;
    canonical_url: string;
};

type Props = { post: PostData; categories: Option[]; tags: Option[]; authors: Option[] };

const slugify = (value: string) =>
    value
        .toLowerCase()
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .replace(/[^a-z0-9\s-]/g, '')
        .trim()
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-');

function Panel({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
    return (
        <section className="space-y-4 rounded-2xl border bg-card p-5">
            <div>
                <h2 className="font-medium">{title}</h2>
                {description && <p className="text-sm text-muted-foreground">{description}</p>}
            </div>
            {children}
        </section>
    );
}

export default function PostForm({ post, categories, tags, authors }: Props) {
    const isNew = post.id === null;
    const [title, setTitle] = useState(post.title);
    const [slug, setSlug] = useState(post.slug);
    const [slugTouched, setSlugTouched] = useState(Boolean(post.slug));
    const [status, setStatus] = useState(post.status);
    const [tagIds, setTagIds] = useState<number[]>(post.tag_ids);
    const [removeCover, setRemoveCover] = useState(false);

    const toggleTag = (id: number) => setTagIds((current) => (current.includes(id) ? current.filter((x) => x !== id) : [...current, id]));

    return (
        <>
            <Head title={isNew ? 'Nuevo artículo' : `Editar · ${post.title}`} />

            <Form {...(isNew ? store.form() : update.form(post.id!))} options={{ preserveScroll: true }} className="max-w-6xl space-y-6 p-4">
                {({ processing, errors }) => (
                    <>
                        <div className="flex flex-wrap items-center justify-between gap-3">
                            <div className="flex items-center gap-3">
                                <Button variant="ghost" size="icon" asChild>
                                    <Link href={index()} aria-label="Volver al blog">
                                        <ArrowLeft className="size-5" />
                                    </Link>
                                </Button>
                                <div>
                                    <h1 className="text-xl font-semibold">{isNew ? 'Nuevo artículo' : 'Editar artículo'}</h1>
                                    <p className="font-mono text-xs text-muted-foreground">/blog/{slug || '…'}</p>
                                </div>
                            </div>
                            <div className="flex gap-2">
                                {post.url && (
                                    <Button variant="outline" asChild>
                                        <a href={post.url} target="_blank" rel="noreferrer">
                                            <ExternalLink className="size-4" /> Ver
                                        </a>
                                    </Button>
                                )}
                                <Button disabled={processing}>
                                    <Save className="size-4" /> {processing ? 'Guardando…' : 'Guardar'}
                                </Button>
                            </div>
                        </div>

                        <BlogNav />

                        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
                            <div className="space-y-6">
                                <Panel title="Contenido" description="El título es el único encabezado principal de la página.">
                                    <Field label="Título">
                                        <TextInput
                                            name="title"
                                            required
                                            maxLength={160}
                                            value={title}
                                            onChange={(event) => {
                                                setTitle(event.target.value);

                                                if (!slugTouched) {
                                                    setSlug(slugify(event.target.value));
                                                }
                                            }}
                                        />
                                        <InputError message={errors.title} />
                                    </Field>
                                    <Field label="Dirección" hint="Cambiarla rompe los enlaces que ya se hayan compartido.">
                                        <TextInput
                                            name="slug"
                                            maxLength={160}
                                            value={slug}
                                            onChange={(event) => {
                                                setSlugTouched(true);
                                                setSlug(slugify(event.target.value));
                                            }}
                                        />
                                        <InputError message={errors.slug} />
                                    </Field>
                                    <Field label="Resumen" hint="Aparece en las tarjetas y en buscadores. Vacío: se toma el inicio del texto.">
                                        <TextArea name="excerpt" rows={3} maxLength={1000} defaultValue={post.excerpt} />
                                        <InputError message={errors.excerpt} />
                                    </Field>
                                    <div className="space-y-1.5">
                                        <p className="text-[11px] font-semibold tracking-widest text-muted-foreground uppercase">Contenido</p>
                                        <RichTextEditor id="body" name="body" uploadUrl={image.url()} defaultValue={post.body} />
                                        <InputError message={errors.body} />
                                    </div>
                                </Panel>

                                <Panel title="SEO" description="Cómo aparece el artículo en Google y al compartirlo. Vacíos se usan el título y el resumen.">
                                    <div className="grid gap-4 md:grid-cols-2">
                                        <Field label="Título en Google">
                                            <TextInput name="meta_title" maxLength={255} defaultValue={post.meta_title} />
                                            <InputError message={errors.meta_title} />
                                        </Field>
                                        <Field label="Palabras clave">
                                            <TextInput name="meta_keywords" maxLength={500} defaultValue={post.meta_keywords} />
                                        </Field>
                                    </div>
                                    <Field label="Descripción en Google">
                                        <TextArea name="meta_description" rows={3} maxLength={500} defaultValue={post.meta_description} />
                                        <InputError message={errors.meta_description} />
                                    </Field>
                                    <div className="grid gap-4 md:grid-cols-2">
                                        <Field label="Título al compartir">
                                            <TextInput name="og_title" maxLength={255} defaultValue={post.og_title} />
                                        </Field>
                                        <Field label="URL canónica (opcional)">
                                            <TextInput name="canonical_url" type="url" maxLength={2048} placeholder="https://" defaultValue={post.canonical_url} />
                                            <InputError message={errors.canonical_url} />
                                        </Field>
                                    </div>
                                    <Field label="Descripción al compartir">
                                        <TextArea name="og_description" rows={2} maxLength={500} defaultValue={post.og_description} />
                                    </Field>
                                </Panel>
                            </div>

                            <aside className="space-y-6">
                                <Panel title="Publicación">
                                    <Field label="Estado">
                                        <select name="status" className={controlClass} value={status} onChange={(event) => setStatus(event.target.value as PostData['status'])}>
                                            <option value="draft">Borrador</option>
                                            <option value="published">Publicado / programado</option>
                                        </select>
                                    </Field>
                                    {status === 'published' && (
                                        <Field label="Fecha de publicación" hint="Con una fecha futura queda programado. Vacía: ahora.">
                                            <TextInput type="datetime-local" name="published_at" defaultValue={post.published_at ?? ''} />
                                            <InputError message={errors.published_at} />
                                        </Field>
                                    )}
                                    <label className="flex items-center gap-2 text-sm">
                                        <input type="checkbox" name="is_featured" value="1" defaultChecked={post.is_featured} className="size-4 accent-brand" />
                                        Artículo destacado (aparece grande al inicio del blog)
                                    </label>
                                </Panel>

                                <Panel title="Portada">
                                    {post.cover_url && !removeCover && <img src={post.cover_url} alt="" className="aspect-video w-full rounded-lg object-cover" />}
                                    <input type="file" name="cover" accept="image/png,image/jpeg,image/webp" className="block w-full text-sm" />
                                    <p className="text-xs text-muted-foreground">PNG, JPG o WebP de hasta 4 MB, horizontal.</p>
                                    <InputError message={errors.cover} />
                                    {post.cover_url && (
                                        <label className="flex items-center gap-2 text-sm">
                                            <input
                                                type="checkbox"
                                                name="remove_cover"
                                                value="1"
                                                checked={removeCover}
                                                onChange={(event) => setRemoveCover(event.target.checked)}
                                                className="size-4"
                                            />
                                            Quitar la portada actual
                                        </label>
                                    )}
                                    <Field label="Texto alternativo">
                                        <TextInput name="cover_alt" maxLength={255} defaultValue={post.cover_alt} />
                                    </Field>
                                </Panel>

                                <Panel title="Clasificación">
                                    <Field label="Autor">
                                        <select name="user_id" className={controlClass} defaultValue={post.user_id ?? ''}>
                                            <option value="">Equipo FEGAT</option>
                                            {authors.map((item) => (
                                                <option key={item.id} value={item.id}>
                                                    {item.name}
                                                </option>
                                            ))}
                                        </select>
                                    </Field>
                                    <Field label="Categoría">
                                        <select name="category_id" className={controlClass} defaultValue={post.category_id ?? ''}>
                                            <option value="">Sin categoría</option>
                                            {categories.map((item) => (
                                                <option key={item.id} value={item.id}>
                                                    {item.name}
                                                </option>
                                            ))}
                                        </select>
                                    </Field>
                                    <div>
                                        <p className="mb-2 text-[11px] font-semibold tracking-widest text-muted-foreground uppercase">Etiquetas</p>
                                        {tags.length === 0 && (
                                            <p className="text-xs text-muted-foreground">Créalas en «Categorías y etiquetas».</p>
                                        )}
                                        <div className="flex flex-wrap gap-2">
                                            {tags.map((tag) => (
                                                <button
                                                    type="button"
                                                    key={tag.id}
                                                    aria-pressed={tagIds.includes(tag.id)}
                                                    onClick={() => toggleTag(tag.id)}
                                                    className={cn('rounded-full border px-3 py-1 text-xs', tagIds.includes(tag.id) && 'border-brand bg-brand text-white')}
                                                >
                                                    {tag.name}
                                                </button>
                                            ))}
                                        </div>
                                        {tagIds.map((id) => (
                                            <input key={id} type="hidden" name="tag_ids[]" value={id} />
                                        ))}
                                    </div>
                                </Panel>
                            </aside>
                        </div>
                    </>
                )}
            </Form>
        </>
    );
}

PostForm.layout = {
    breadcrumbs: [{ title: 'Blog', href: index() }],
};
