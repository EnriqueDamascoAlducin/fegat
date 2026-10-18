import { Head, router } from '@inertiajs/react';
import { Save } from 'lucide-react';
import { useState } from 'react';
import type { ReactNode } from 'react';
import BlogNav from '@/components/admin/blog-nav';
import Heading from '@/components/heading';
import InputError from '@/components/input-error';
import { Field, ImageField, LinkSelector, TextArea, TextInput, Toggle } from '@/components/site/editor-fields';
import { Button } from '@/components/ui/button';
import * as settings from '@/routes/admin/blog/settings';
import type { NavOptions, SiteLink } from '@/types/site';

type Config = {
    enabled: boolean;
    title: string;
    subtitle: string;
    hero_image: string;
    posts_per_page: number;
    show_featured: boolean;
    related_count: number;
    cta: SiteLink & { enabled: boolean; title: string; label: string };
};

function Panel({ title, children }: { title: string; children: ReactNode }) {
    return (
        <section className="space-y-4 rounded-2xl border p-5">
            <h2 className="font-medium">{title}</h2>
            {children}
        </section>
    );
}

export default function BlogSettings({ config, navOptions }: { config: Config; navOptions: NavOptions }) {
    const [data, setData] = useState(config);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [saving, setSaving] = useState(false);
    const set = (patch: Partial<Config>) => setData((current) => ({ ...current, ...patch }));
    const setCta = (patch: Partial<Config['cta']>) => setData((current) => ({ ...current, cta: { ...current.cta, ...patch } }));

    const save = () => {
        setSaving(true);
        router.put(settings.update.url(), data, {
            preserveScroll: true,
            preserveState: true,
            onSuccess: () => setErrors({}),
            onError: setErrors,
            onFinish: () => setSaving(false),
        });
    };

    return (
        <>
            <Head title="Configuración del blog" />

            <div className="max-w-6xl space-y-6 p-4">
                <div className="flex items-start justify-between gap-4">
                    <Heading title="Blog" description="Presentación del índice y llamado a la acción de los artículos." />
                    <Button onClick={save} disabled={saving}>
                        <Save className="size-4" /> {saving ? 'Guardando…' : 'Guardar'}
                    </Button>
                </div>

                <BlogNav />

                <div className="grid gap-6 lg:grid-cols-2">
                    <Panel title="Portada del blog">
                        <Toggle
                            label="Blog público activo"
                            description="Apagado, /blog y sus artículos responden «no encontrado»."
                            checked={data.enabled}
                            onChange={(enabled) => set({ enabled })}
                        />
                        <Field label="Título">
                            <TextInput value={data.title} maxLength={255} onChange={(event) => set({ title: event.target.value })} />
                            <InputError message={errors.title} />
                        </Field>
                        <Field label="Subtítulo">
                            <TextArea rows={3} maxLength={1000} value={data.subtitle} onChange={(event) => set({ subtitle: event.target.value })} />
                        </Field>
                        <ImageField label="Imagen de portada (opcional)" value={data.hero_image} onChange={(hero_image) => set({ hero_image })} />
                    </Panel>

                    <div className="space-y-6">
                        <Panel title="Comportamiento">
                            <div className="grid gap-4 sm:grid-cols-2">
                                <Field label="Artículos por página">
                                    <TextInput
                                        type="number"
                                        min={3}
                                        max={48}
                                        value={data.posts_per_page}
                                        onChange={(event) => set({ posts_per_page: Number(event.target.value) })}
                                    />
                                    <InputError message={errors.posts_per_page} />
                                </Field>
                                <Field label="Artículos relacionados" hint="0 para no mostrarlos.">
                                    <TextInput
                                        type="number"
                                        min={0}
                                        max={6}
                                        value={data.related_count}
                                        onChange={(event) => set({ related_count: Number(event.target.value) })}
                                    />
                                    <InputError message={errors.related_count} />
                                </Field>
                            </div>
                            <Toggle
                                label="Mostrar artículo destacado"
                                description="El último marcado como destacado aparece grande al inicio."
                                checked={data.show_featured}
                                onChange={(show_featured) => set({ show_featured })}
                            />
                        </Panel>

                        <Panel title="Llamado a la acción">
                            <Toggle label="Mostrar al final de cada artículo" checked={data.cta.enabled} onChange={(enabled) => setCta({ enabled })} />
                            <Field label="Título">
                                <TextInput value={data.cta.title} maxLength={255} onChange={(event) => setCta({ title: event.target.value })} />
                            </Field>
                            <Field label="Texto del botón">
                                <TextInput value={data.cta.label} maxLength={100} onChange={(event) => setCta({ label: event.target.value })} />
                            </Field>
                            <Field label="Destino">
                                <LinkSelector
                                    value={data.cta}
                                    navOptions={navOptions}
                                    onChange={(link) => setCta({ url: link.url, link_type: link.link_type, ref_id: link.ref_id ?? null })}
                                />
                            </Field>
                        </Panel>
                    </div>
                </div>
            </div>
        </>
    );
}

BlogSettings.layout = {
    breadcrumbs: [{ title: 'Blog', href: settings.edit() }],
};
