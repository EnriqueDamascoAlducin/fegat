import { Form, Head, router } from '@inertiajs/react';
import { ArrowDown, ArrowUp } from 'lucide-react';
import { useState } from 'react';
import Heading from '@/components/heading';
import InputError from '@/components/input-error';
import RichTextEditor from '@/components/rich-text-editor';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { edit, update } from '@/routes/admin/home';
import {
    destroy,
    image as uploadImage,
    move,
    store,
    update as updateSection,
} from '@/routes/admin/sections';

type ContactDetails = {
    contact_email: string | null;
    contact_phones: string | null;
    contact_hours: string | null;
    contact_address: string | null;
    map_url: string | null;
    facebook_url: string | null;
    instagram_url: string | null;
    tiktok_url: string | null;
    youtube_url: string | null;
};

type Content = ContactDetails & {
    hero_title: string;
    hero_text: string | null;
    semaphore_text: string;
    contact_text: string;
    hero_image_url: string | null;
};

type SitePageOption = {
    value: string;
    label: string;
};

type Section = {
    id: number;
    page: string;
    title: string;
    body: string;
    image_url: string | null;
    is_visible: boolean;
};

/** Texto sin etiquetas para la vista previa de la lista. */
const plainText = (html: string) => html.replace(/<[^>]+>/g, ' ').trim();

const textareaClass =
    'w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50';

const IMAGE_HINT = 'PNG, JPG o WebP de hasta 2 MB.';

const contactFields: {
    name: keyof ContactDetails;
    label: string;
    type?: string;
    placeholder?: string;
    max?: number;
}[] = [
    {
        name: 'contact_email',
        label: 'Correo institucional',
        type: 'email',
        placeholder: 'contacto@fegat.mx',
    },
    {
        name: 'contact_phones',
        label: 'Teléfonos',
        placeholder: '594 123 4567 · 55 1234 5678',
    },
    {
        name: 'contact_hours',
        label: 'Horario de atención',
        placeholder: 'Lunes a viernes de 9:00 a 17:00',
    },
    { name: 'contact_address', label: 'Dirección de la oficina', max: 500 },
    {
        name: 'map_url',
        label: 'Enlace de Google Maps',
        type: 'url',
        placeholder: 'https://maps.app.goo.gl/…',
        max: 1000,
    },
    { name: 'facebook_url', label: 'Facebook', type: 'url' },
    { name: 'instagram_url', label: 'Instagram', type: 'url' },
    { name: 'tiktok_url', label: 'TikTok', type: 'url' },
    { name: 'youtube_url', label: 'YouTube', type: 'url' },
];

function SectionFields({
    section,
    pages,
    defaultPage,
    errors,
    editorKey,
}: {
    section?: Section;
    pages: SitePageOption[];
    defaultPage: string;
    errors: Record<string, string>;
    /** Cambia para vaciar el editor después de agregar una sección. */
    editorKey?: number;
}) {
    const id = section?.id ?? 'new';

    return (
        <div className="grid gap-4">
            <div className="grid gap-2">
                <Label htmlFor={`page-${id}`}>Página</Label>
                <select
                    // Se reinicia al cambiar de pestaña para seguirla.
                    key={section ? undefined : defaultPage}
                    id={`page-${id}`}
                    name="page"
                    defaultValue={section?.page ?? defaultPage}
                    className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                >
                    {pages.map((page) => (
                        <option key={page.value} value={page.value}>
                            {page.label}
                        </option>
                    ))}
                </select>
                <InputError message={errors.page} />
            </div>

            <div className="grid gap-2">
                <Label htmlFor={`title-${id}`}>Título</Label>
                <Input
                    id={`title-${id}`}
                    name="title"
                    required
                    maxLength={120}
                    placeholder="Misión"
                    defaultValue={section?.title}
                />
                <InputError message={errors.title} />
            </div>

            <div className="grid gap-2">
                <Label htmlFor={`body-${id}`}>Texto</Label>
                <RichTextEditor
                    key={editorKey}
                    id={`body-${id}`}
                    name="body"
                    uploadUrl={uploadImage.url()}
                    defaultValue={section?.body}
                />
                <InputError message={errors.body} />
            </div>

            <div className="grid gap-2">
                <Label htmlFor={`image-${id}`}>Imagen (opcional)</Label>
                <div className="flex items-center gap-3">
                    {section?.image_url && (
                        <img
                            src={section.image_url}
                            alt=""
                            className="size-16 shrink-0 rounded-lg border object-cover"
                        />
                    )}
                    <Input
                        id={`image-${id}`}
                        name="image"
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                    />
                </div>
                <p className="text-sm text-muted-foreground">{IMAGE_HINT}</p>
                <InputError message={errors.image} />

                {section?.image_url && (
                    <label className="flex items-center gap-2 text-sm">
                        <input
                            type="checkbox"
                            name="remove_image"
                            value="1"
                            className="size-4"
                        />
                        Quitar la imagen actual
                    </label>
                )}
            </div>

            <label className="flex items-center gap-2 text-sm">
                <input
                    type="checkbox"
                    name="is_visible"
                    value="1"
                    defaultChecked={section?.is_visible ?? true}
                    className="size-4"
                />
                Visible en la página pública
            </label>
        </div>
    );
}

export default function Home({
    content,
    pages,
    sections: allSections,
}: {
    content: Content;
    pages: SitePageOption[];
    sections: Section[];
}) {
    const [editing, setEditing] = useState<number | null>(null);
    const [createKey, setCreateKey] = useState(0);
    const [activePage, setActivePage] = useState(pages[0].value);
    const sections = allSections.filter(
        (section) => section.page === activePage,
    );
    const activeLabel =
        pages.find((page) => page.value === activePage)?.label ?? '';

    const remove = (section: Section) => {
        if (confirm(`¿Eliminar la sección «${section.title}»?`)) {
            router.delete(destroy.url(section.id), { preserveScroll: true });
        }
    };

    const reorder = (section: Section, direction: 'up' | 'down') => {
        router.post(
            move.url(section.id),
            { direction },
            { preserveScroll: true },
        );
    };

    return (
        <>
            <Head title="Sitio público" />

            <div className="max-w-3xl space-y-10 p-4">
                <Heading
                    title="Sitio público"
                    description="Portada, datos de contacto y secciones de cada página del sitio."
                />

                <Form
                    {...update.form()}
                    options={{ preserveScroll: true }}
                    className="space-y-5 rounded-2xl border p-6"
                >
                    {({ processing, errors }) => (
                        <>
                            <h3 className="font-medium">Portada y textos</h3>

                            <div className="grid gap-2">
                                <Label htmlFor="hero_title">
                                    Título de la portada
                                </Label>
                                <Input
                                    id="hero_title"
                                    name="hero_title"
                                    required
                                    maxLength={150}
                                    defaultValue={content.hero_title}
                                />
                                <InputError message={errors.hero_title} />
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="hero_text">
                                    Texto bajo el título (opcional)
                                </Label>
                                <textarea
                                    id="hero_text"
                                    name="hero_text"
                                    rows={2}
                                    maxLength={500}
                                    defaultValue={content.hero_text ?? ''}
                                    className={textareaClass}
                                />
                                <InputError message={errors.hero_text} />
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="hero_image">
                                    Imagen de la portada
                                </Label>
                                <div className="flex items-center gap-3">
                                    {content.hero_image_url && (
                                        <img
                                            src={content.hero_image_url}
                                            alt=""
                                            className="size-16 shrink-0 rounded-lg border bg-brand object-contain p-1"
                                        />
                                    )}
                                    <Input
                                        id="hero_image"
                                        name="hero_image"
                                        type="file"
                                        accept="image/png,image/jpeg,image/webp"
                                    />
                                </div>
                                <p className="text-sm text-muted-foreground">
                                    {IMAGE_HINT} Si no subes ninguna se usa el
                                    globo de FEGAT.
                                </p>
                                <InputError message={errors.hero_image} />

                                {content.hero_image_url && (
                                    <label className="flex items-center gap-2 text-sm">
                                        <input
                                            type="checkbox"
                                            name="remove_hero_image"
                                            value="1"
                                            className="size-4"
                                        />
                                        Volver al globo de FEGAT
                                    </label>
                                )}
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="semaphore_text">
                                    Texto de la sección «Semáforo de vuelos»
                                </Label>
                                <textarea
                                    id="semaphore_text"
                                    name="semaphore_text"
                                    rows={2}
                                    required
                                    maxLength={500}
                                    defaultValue={content.semaphore_text}
                                    className={textareaClass}
                                />
                                <InputError message={errors.semaphore_text} />
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="contact_text">
                                    Texto de la sección «Contacto»
                                </Label>
                                <textarea
                                    id="contact_text"
                                    name="contact_text"
                                    rows={2}
                                    required
                                    maxLength={500}
                                    defaultValue={content.contact_text}
                                    className={textareaClass}
                                />
                                <InputError message={errors.contact_text} />
                            </div>

                            <div className="space-y-4 border-t pt-5">
                                <div>
                                    <h3 className="font-medium">
                                        Datos de contacto y redes
                                    </h3>
                                    <p className="text-sm text-muted-foreground">
                                        Se muestran en la página «Contacto».
                                        Deja vacío lo que no quieras publicar.
                                    </p>
                                </div>

                                {contactFields.map((field) => (
                                    <div key={field.name} className="grid gap-2">
                                        <Label htmlFor={field.name}>
                                            {field.label}
                                        </Label>
                                        <Input
                                            id={field.name}
                                            name={field.name}
                                            type={field.type ?? 'text'}
                                            maxLength={field.max ?? 255}
                                            placeholder={
                                                field.placeholder ??
                                                (field.type === 'url'
                                                    ? 'https://'
                                                    : undefined)
                                            }
                                            defaultValue={
                                                content[field.name] ?? ''
                                            }
                                        />
                                        <InputError
                                            message={errors[field.name]}
                                        />
                                    </div>
                                ))}
                            </div>

                            <Button disabled={processing}>Guardar</Button>
                        </>
                    )}
                </Form>

                <div className="space-y-4">
                    <Heading
                        variant="small"
                        title="Secciones de cada página"
                        description="Textos con formato que aparecen en la página elegida, en este orden. En el inicio van después del semáforo y el clima."
                    />

                    <div
                        role="tablist"
                        aria-label="Página"
                        className="flex flex-wrap gap-2"
                    >
                        {pages.map((page) => {
                            const count = allSections.filter(
                                (section) => section.page === page.value,
                            ).length;

                            return (
                                <Button
                                    key={page.value}
                                    type="button"
                                    role="tab"
                                    size="sm"
                                    aria-selected={activePage === page.value}
                                    variant={
                                        activePage === page.value
                                            ? 'default'
                                            : 'outline'
                                    }
                                    onClick={() => {
                                        setActivePage(page.value);
                                        setEditing(null);
                                    }}
                                >
                                    {page.label}
                                    <span className="text-xs opacity-70">
                                        {count}
                                    </span>
                                </Button>
                            );
                        })}
                    </div>

                    {sections.length === 0 && (
                        <p className="rounded-2xl border border-dashed p-6 text-center text-sm text-muted-foreground">
                            «{activeLabel}» aún no tiene secciones.
                        </p>
                    )}

                    {sections.length > 0 && (
                        <ul className="divide-y rounded-2xl border">
                            {sections.map((section, index) => (
                                <li key={section.id} className="p-4">
                                    {editing === section.id ? (
                                        <Form
                                            {...updateSection.form(section.id)}
                                            options={{ preserveScroll: true }}
                                            onSuccess={() => setEditing(null)}
                                            className="space-y-4"
                                        >
                                            {({ processing, errors }) => (
                                                <>
                                                    <SectionFields
                                                        section={section}
                                                        pages={pages}
                                                        defaultPage={activePage}
                                                        errors={errors}
                                                    />
                                                    <div className="flex gap-2">
                                                        <Button
                                                            disabled={
                                                                processing
                                                            }
                                                        >
                                                            Guardar
                                                        </Button>
                                                        <Button
                                                            type="button"
                                                            variant="ghost"
                                                            onClick={() =>
                                                                setEditing(null)
                                                            }
                                                        >
                                                            Cancelar
                                                        </Button>
                                                    </div>
                                                </>
                                            )}
                                        </Form>
                                    ) : (
                                        <div className="flex items-center gap-3">
                                            <div className="flex shrink-0 flex-col">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="size-7"
                                                    disabled={index === 0}
                                                    aria-label="Subir sección"
                                                    onClick={() =>
                                                        reorder(section, 'up')
                                                    }
                                                >
                                                    <ArrowUp className="size-4" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="size-7"
                                                    disabled={
                                                        index ===
                                                        sections.length - 1
                                                    }
                                                    aria-label="Bajar sección"
                                                    onClick={() =>
                                                        reorder(section, 'down')
                                                    }
                                                >
                                                    <ArrowDown className="size-4" />
                                                </Button>
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <p className="font-medium">
                                                    {section.title}
                                                    {!section.is_visible && (
                                                        <span className="ml-2 text-xs font-normal text-muted-foreground">
                                                            Oculta
                                                        </span>
                                                    )}
                                                </p>
                                                <p className="truncate text-sm text-muted-foreground">
                                                    {plainText(section.body)}
                                                </p>
                                            </div>
                                            <div className="flex shrink-0 gap-2">
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() =>
                                                        setEditing(section.id)
                                                    }
                                                >
                                                    Editar
                                                </Button>
                                                <Button
                                                    variant="destructive"
                                                    size="sm"
                                                    onClick={() =>
                                                        remove(section)
                                                    }
                                                >
                                                    Eliminar
                                                </Button>
                                            </div>
                                        </div>
                                    )}
                                </li>
                            ))}
                        </ul>
                    )}

                    <Form
                        {...store.form()}
                        resetOnSuccess
                        onSuccess={() => setCreateKey((key) => key + 1)}
                        options={{ preserveScroll: true }}
                        className="space-y-4 rounded-2xl border p-6"
                    >
                        {({ processing, errors }) => (
                            <>
                                <h3 className="font-medium">Agregar sección</h3>
                                <SectionFields
                                    pages={pages}
                                    defaultPage={activePage}
                                    errors={errors}
                                    editorKey={createKey}
                                />
                                <Button disabled={processing}>Agregar</Button>
                            </>
                        )}
                    </Form>
                </div>
            </div>
        </>
    );
}

Home.layout = {
    breadcrumbs: [
        {
            title: 'Sitio público',
            href: edit(),
        },
    ],
};
