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

type Content = {
    hero_title: string;
    hero_text: string | null;
    semaphore_text: string;
    contact_text: string;
    hero_image_url: string | null;
};

type Section = {
    id: number;
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

function SectionFields({
    section,
    errors,
    editorKey,
}: {
    section?: Section;
    errors: Record<string, string>;
    /** Cambia para vaciar el editor después de agregar una sección. */
    editorKey?: number;
}) {
    const id = section?.id ?? 'new';

    return (
        <div className="grid gap-4">
            <div className="grid gap-2">
                <Label htmlFor={`title-${id}`}>Título</Label>
                <Input
                    id={`title-${id}`}
                    name="title"
                    required
                    maxLength={120}
                    placeholder="¿Por qué elegirnos?"
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
    sections,
}: {
    content: Content;
    sections: Section[];
}) {
    const [editing, setEditing] = useState<number | null>(null);
    const [createKey, setCreateKey] = useState(0);

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
            <Head title="Página de inicio" />

            <div className="max-w-3xl space-y-10 p-4">
                <Heading
                    title="Página de inicio"
                    description="Textos, imagen de portada y secciones informativas del sitio público."
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

                            <Button disabled={processing}>Guardar</Button>
                        </>
                    )}
                </Form>

                <div className="space-y-4">
                    <Heading
                        variant="small"
                        title="Secciones informativas"
                        description="Aparecen en el sitio entre el semáforo y los logos de las empresas, en este orden."
                    />

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
            title: 'Página de inicio',
            href: edit(),
        },
    ],
};
