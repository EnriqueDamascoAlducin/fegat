// Editor de páginas por bloques (port de CustomPageEditor de sav_3).
import { DndContext, PointerSensor, closestCenter, useSensor, useSensors } from '@dnd-kit/core';
import type { DragEndEvent } from '@dnd-kit/core';
import { SortableContext, arrayMove, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
    BarChart3,
    Building2,
    CheckCircle2,
    CloudSun,
    Copy,
    GripVertical,
    HelpCircle,
    Image as ImageIcon,
    Images,
    LayoutGrid,
    LayoutTemplate,
    ListOrdered,
    Mail,
    Megaphone,
    MessageSquare,
    Newspaper,
    PanelLeft,
    ToggleLeft,
    ToggleRight,
    Trash2,
    TrafficCone,
    Type,
} from 'lucide-react';
import { useState } from 'react';
import type { ElementType, ReactNode } from 'react';
import {
    AddButton,
    BulkImageUpload,
    ColorField,
    Field,
    IconPicker,
    ImageField,
    LinkSelector,
    RichTextField,
    Select,
    TextArea,
    TextInput,
    Toggle,
} from '@/components/site/editor-fields';
import { stripHtml, uid } from '@/lib/site-blocks';
import { cn } from '@/lib/utils';
import type { BlockType, LinkType, NavOptions, PageBlock, PageContent, PageTheme } from '@/types/site';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Settings = Record<string, any>;
type Patch = (value: Settings) => void;

export const BLOCK_META: Record<BlockType, { label: string; icon: ElementType; hint: string }> = {
    hero: { label: 'Hero', icon: LayoutTemplate, hint: 'Portada con título, texto, imagen y botones.' },
    rich_text: { label: 'Texto', icon: Type, hint: 'Sección de texto con formato.' },
    image: { label: 'Imagen', icon: ImageIcon, hint: 'Imagen amplia o junto a un texto.' },
    image_cards: { label: 'Tarjetas', icon: LayoutGrid, hint: 'Tarjetas con imagen, título y texto.' },
    image_features: { label: 'Imagen + características', icon: PanelLeft, hint: 'Imagen de un lado y características con icono del otro.' },
    gallery: { label: 'Galería', icon: Images, hint: 'Fotos en cuadrícula, carrusel o mosaico, con visor a pantalla completa.' },
    stats: { label: 'Cifras', icon: BarChart3, hint: 'Estadísticas de impacto (número y etiqueta).' },
    why_us: { label: 'Valores', icon: CheckCircle2, hint: 'Tarjetas con icono: valores, razones, programas.' },
    process: { label: 'Pasos', icon: ListOrdered, hint: 'Proceso numerado.' },
    testimonials: { label: 'Testimonios', icon: MessageSquare, hint: 'Opiniones con nombre y foto.' },
    cta: { label: 'Llamado a la acción', icon: Megaphone, hint: 'Banda destacada con botones.' },
    faqs: { label: 'Preguntas', icon: HelpCircle, hint: 'Preguntas frecuentes desplegables.' },
    semaphore: { label: 'Semáforo', icon: TrafficCone, hint: 'Semáforo de vuelos del día, en vivo.' },
    weather: { label: 'Clima', icon: CloudSun, hint: 'Pronóstico de Teotihuacán para la mañana de vuelo.' },
    associates: { label: 'Asociados', icon: Building2, hint: 'Logos de las empresas activas (se editan en Empresas).' },
    posts: { label: 'Blog', icon: Newspaper, hint: 'Últimas publicaciones del blog.' },
    contact: { label: 'Contacto', icon: Mail, hint: 'Formulario y datos de contacto (se editan en Sitio público).' },
};

const BLOCK_ORDER: BlockType[] = [
    'hero',
    'rich_text',
    'image',
    'image_cards',
    'image_features',
    'gallery',
    'stats',
    'why_us',
    'process',
    'testimonials',
    'cta',
    'faqs',
    'semaphore',
    'weather',
    'associates',
    'posts',
    'contact',
];

const DESIGN_VARIANTS = [
    { value: 6, label: 'Clásico FEGAT' },
    { value: 1, label: 'Oscuro' },
    { value: 2, label: 'Amanecer' },
    { value: 3, label: 'Fresh' },
    { value: 4, label: 'Cálido' },
    { value: 5, label: 'Minimal' },
];

const THEME_COLORS: { key: keyof PageTheme; label: string }[] = [
    { key: 'primary', label: 'Primario' },
    { key: 'secondary', label: 'Secundario' },
    { key: 'accent', label: 'Acento' },
    { key: 'background', label: 'Fondo suave' },
    { key: 'text', label: 'Texto' },
];

const emptyButtons = {
    primary_label: '',
    primary_url: '',
    primary_link_type: 'custom',
    primary_ref_id: null,
    secondary_label: '',
    secondary_url: '',
    secondary_link_type: 'custom',
    secondary_ref_id: null,
};

export function newBlock(type: BlockType): PageBlock {
    const base = { id: uid(type), type, enabled: true };
    const heading = { eyebrow: '', title: `<p>${BLOCK_META[type].label}</p>`, description: '' };

    const settings: Record<BlockType, Settings> = {
        hero: {
            badge: '',
            title: '<p>Título de la página</p>',
            subtitle: '<p>Escribe una introducción clara para los visitantes.</p>',
            image: '',
            image_mobile: '',
            image_alt: '',
            image_position: 'center',
            image_layout: 'background',
            overlay_enabled: true,
            overlay_color: '#2c0d38',
            overlay_opacity: 55,
            align: 'center',
            ...emptyButtons,
        },
        rich_text: { eyebrow: '', title: '<p>Nueva sección</p>', body: '<p>Agrega el contenido de esta sección.</p>', width: 'normal' },
        image: { ...heading, title: '', image: '', alt: '', layout: 'wide', overlay_enabled: false, overlay_color: '#160C19', overlay_opacity: 45 },
        image_cards: {
            ...heading,
            text_position: 'bottom',
            columns: 3,
            items: [1, 2, 3].map(() => ({ image: '', alt: '', icon: '', title: '', desc: '' })),
        },
        image_features: {
            ...heading,
            image: '',
            alt: '',
            image_side: 'left',
            card_icon: 'Camera',
            card_title: '',
            card_desc: '',
            items: ['Shield', 'Users', 'Leaf', 'Award'].map((icon) => ({ icon, title: '', desc: '' })),
        },
        gallery: { ...heading, title: '<p>Galería</p>', images: [], layout: 'grid', overlay_enabled: false, overlay_color: '#160C19', overlay_opacity: 35 },
        stats: { ...heading, title: '<p>Nuestro impacto</p>', items: [1, 2, 3, 4].map(() => ({ value: '', label: '' })) },
        why_us: {
            ...heading,
            title: '<p>Valores</p>',
            columns: 3,
            items: ['Shield', 'Medal', 'Handshake'].map((icon) => ({ icon, title: '', desc: '' })),
        },
        process: {
            ...heading,
            title: '<p>¿Cómo funciona?</p>',
            steps: ['Calendar', 'Shield', 'Plane'].map((icon, index) => ({ n: String(index + 1).padStart(2, '0'), icon, title: '', desc: '' })),
        },
        testimonials: { ...heading, title: '<p>Testimonios</p>', items: [1, 2, 3].map(() => ({ name: '', role: '', text: '', avatar: '' })) },
        cta: {
            badge: '',
            title: '<p>¿Quieres apoyar a la federación?</p>',
            description: '<p>Invita al visitante a dar el siguiente paso.</p>',
            image: '',
            overlay_enabled: false,
            overlay_color: '#160C19',
            overlay_opacity: 45,
            ...emptyButtons,
        },
        faqs: { ...heading, title: '<p>Preguntas frecuentes</p>', items: [{ question: 'Nueva pregunta', answer: 'Respuesta.' }] },
        semaphore: { ...heading, title: '<p>Semáforo de vuelos</p>' },
        weather: { ...heading, title: '<p>Clima en Teotihuacán</p>' },
        associates: { ...heading, title: '<p>Asociados</p>' },
        posts: { ...heading, title: '<p>Blog</p>', limit: 3, button_label: 'Ver todas las publicaciones' },
        contact: { ...heading, title: '<p>Contacto</p>', show_details: true, submit_label: 'Enviar mensaje', success_message: 'Tu mensaje ha sido enviado. ¡Gracias!' },
    };

    return { ...base, settings: settings[type] };
}

function SortableRow({ id, children }: { id: string; children: (handle: Settings) => ReactNode }) {
    const sortable = useSortable({ id });

    return (
        <div ref={sortable.setNodeRef} style={{ transform: CSS.Transform.toString(sortable.transform), transition: sortable.transition }}>
            {children({ ...sortable.attributes, ...sortable.listeners })}
        </div>
    );
}

function Panel({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
    return (
        <div className="rounded-2xl border bg-card p-4">
            <div className="mb-3">
                <h2 className="text-sm font-bold">{title}</h2>
                {description && <p className="text-xs text-muted-foreground">{description}</p>}
            </div>
            {children}
        </div>
    );
}

function Details({ title, children, defaultOpen = false }: { title: string; children: ReactNode; defaultOpen?: boolean }) {
    return (
        <details className="rounded-xl border bg-muted/20 open:bg-transparent" open={defaultOpen || undefined}>
            <summary className="cursor-pointer list-none px-3 py-2 text-xs font-bold">{title}</summary>
            <div className="space-y-3 border-t p-3">{children}</div>
        </details>
    );
}

export type EditorPage = { title: string; slug: string; is_active: boolean; is_home: boolean };

export default function PageEditor({
    page,
    content,
    navOptions,
    errors,
    onPageChange,
    onContentChange,
}: {
    page: EditorPage;
    content: PageContent;
    navOptions: NavOptions;
    errors: Record<string, string | undefined>;
    onPageChange: (patch: Partial<EditorPage>) => void;
    onContentChange: (content: PageContent) => void;
}) {
    const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));
    const blocks = content.blocks;
    const [selectedId, setSelectedId] = useState<string | null>(blocks[0]?.id ?? null);
    const selected = blocks.find((block) => block.id === selectedId) ?? blocks[0] ?? null;

    const setBlocks = (next: PageBlock[]) => onContentChange({ ...content, blocks: next });
    const setTheme = (patch: Partial<PageTheme>) => onContentChange({ ...content, theme: { ...content.theme, ...patch } });
    const patchBlock = (id: string, patch: Partial<PageBlock>) => setBlocks(blocks.map((block) => (block.id === id ? { ...block, ...patch } : block)));
    const patchSettings = (id: string, patch: Settings) =>
        setBlocks(blocks.map((block) => (block.id === id ? { ...block, settings: { ...block.settings, ...patch } } : block)));

    const addBlock = (type: BlockType) => {
        const block = newBlock(type);
        setBlocks([...blocks, block]);
        setSelectedId(block.id);
    };

    const duplicateBlock = (block: PageBlock) => {
        const copy: PageBlock = { ...structuredClone(block), id: uid(block.type) };
        const index = blocks.findIndex((item) => item.id === block.id);
        setBlocks([...blocks.slice(0, index + 1), copy, ...blocks.slice(index + 1)]);
        setSelectedId(copy.id);
    };

    const removeBlock = (block: PageBlock) => {
        if (!confirm(`¿Eliminar el bloque «${BLOCK_META[block.type].label}»?`)) {
            return;
        }

        const index = blocks.findIndex((item) => item.id === block.id);
        const next = blocks.filter((item) => item.id !== block.id);
        setBlocks(next);
        setSelectedId(next[Math.min(index, next.length - 1)]?.id ?? null);
    };

    const onDragEnd = ({ active, over }: DragEndEvent) => {
        if (over && active.id !== over.id) {
            setBlocks(
                arrayMove(
                    blocks,
                    blocks.findIndex((block) => block.id === active.id),
                    blocks.findIndex((block) => block.id === over.id),
                ),
            );
        }
    };

    return (
        <div className="grid gap-5 lg:grid-cols-[320px_minmax(0,1fr)]">
            <aside className="space-y-4 lg:sticky lg:top-4 lg:self-start">
                <Panel title={page.is_home ? 'Página de inicio' : 'Página'} description="Datos generales y publicación.">
                    <div className="space-y-3">
                        <Field label="Nombre">
                            <TextInput value={page.title} maxLength={120} onChange={(event) => onPageChange({ title: event.target.value })} />
                            {errors.title && <span className="text-xs text-red-600">{errors.title}</span>}
                        </Field>
                        {page.is_home ? (
                            <p className="rounded-lg bg-muted px-3 py-2 text-xs text-muted-foreground">
                                Se muestra en <span className="font-mono">/</span> y siempre está publicada.
                            </p>
                        ) : (
                            <>
                                <Field label="Dirección" hint="Minúsculas, números y guiones.">
                                    <div className="flex items-center gap-1">
                                        <span className="font-mono text-sm text-muted-foreground">/</span>
                                        <TextInput
                                            value={page.slug}
                                            maxLength={80}
                                            onChange={(event) => onPageChange({ slug: event.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-') })}
                                        />
                                    </div>
                                    {errors.slug && <span className="text-xs text-red-600">{errors.slug}</span>}
                                </Field>
                                <button
                                    type="button"
                                    onClick={() => onPageChange({ is_active: !page.is_active })}
                                    className={cn(
                                        'inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-xs font-bold ring-1',
                                        page.is_active ? 'bg-emerald-50 text-emerald-700 ring-emerald-200' : 'bg-muted text-muted-foreground ring-border',
                                    )}
                                >
                                    {page.is_active ? <ToggleRight className="size-4" /> : <ToggleLeft className="size-4" />}
                                    {page.is_active ? 'Publicada' : 'Borrador (solo tú la ves)'}
                                </button>
                            </>
                        )}

                        <Details title="Tema visual">
                            <Field label="Diseño">
                                <div className="grid grid-cols-2 gap-2">
                                    {DESIGN_VARIANTS.map((design) => (
                                        <button
                                            key={design.value}
                                            type="button"
                                            onClick={() => setTheme({ variant: design.value })}
                                            className={cn(
                                                'rounded-lg px-2 py-2 text-xs font-bold ring-1 transition',
                                                content.theme.variant === design.value ? 'bg-brand text-white ring-brand' : 'ring-border hover:bg-muted',
                                            )}
                                        >
                                            {design.label}
                                        </button>
                                    ))}
                                </div>
                            </Field>
                            {THEME_COLORS.map(({ key, label }) => (
                                <ColorField
                                    key={key}
                                    label={label}
                                    value={String(content.theme[key])}
                                    fallback="#6c0ea3"
                                    onChange={(value) => setTheme({ [key]: value } as Partial<PageTheme>)}
                                />
                            ))}
                            <div className="grid grid-cols-[1fr_auto] items-end gap-3">
                                <Field label="Esquinas (px)">
                                    <TextInput type="number" min={0} max={40} value={content.theme.radius} onChange={(event) => setTheme({ radius: Number(event.target.value) })} />
                                </Field>
                                <Toggle label="Sombra" checked={content.theme.shadow} onChange={(shadow) => setTheme({ shadow })} />
                            </div>
                        </Details>

                        <Details title="SEO">
                            <Field label="Título en Google" hint="Si lo dejas vacío se usa el nombre de la página.">
                                <TextInput
                                    value={content.seo.meta_title}
                                    maxLength={70}
                                    onChange={(event) => onContentChange({ ...content, seo: { ...content.seo, meta_title: event.target.value } })}
                                />
                            </Field>
                            <Field label="Descripción en Google">
                                <TextArea
                                    rows={3}
                                    maxLength={300}
                                    value={content.seo.meta_description}
                                    onChange={(event) => onContentChange({ ...content, seo: { ...content.seo, meta_description: event.target.value } })}
                                />
                            </Field>
                            <Field label="Título al compartir (Facebook, WhatsApp)">
                                <TextInput
                                    value={content.seo.og_title}
                                    maxLength={120}
                                    onChange={(event) => onContentChange({ ...content, seo: { ...content.seo, og_title: event.target.value } })}
                                />
                            </Field>
                            <Field label="Descripción al compartir">
                                <TextArea
                                    rows={2}
                                    maxLength={300}
                                    value={content.seo.og_description}
                                    onChange={(event) => onContentChange({ ...content, seo: { ...content.seo, og_description: event.target.value } })}
                                />
                            </Field>
                            <ImageField
                                label="Imagen al compartir"
                                value={content.seo.og_image}
                                onChange={(og_image) => onContentChange({ ...content, seo: { ...content.seo, og_image } })}
                            />
                        </Details>
                    </div>
                </Panel>

                <Panel title="Secciones" description={`${blocks.length} bloques · arrastra para reordenar`}>
                    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
                        <SortableContext items={blocks.map((block) => block.id)} strategy={verticalListSortingStrategy}>
                            <div className="max-h-[40vh] space-y-2 overflow-y-auto pr-1">
                                {blocks.map((block, index) => {
                                    const meta = BLOCK_META[block.type];
                                    const Icon = meta.icon;
                                    const active = selected?.id === block.id;

                                    return (
                                        <SortableRow key={block.id} id={block.id}>
                                            {(handle) => (
                                                <div
                                                    className={cn(
                                                        'flex w-full items-center gap-2 rounded-xl p-2 text-left transition',
                                                        active ? 'bg-brand text-white shadow-sm' : 'bg-muted/50 hover:bg-muted',
                                                        !block.enabled && 'opacity-55',
                                                    )}
                                                >
                                                    <span {...handle} aria-label="Arrastrar para reordenar" className="cursor-grab rounded-md p-1 opacity-60">
                                                        <GripVertical className="size-4" />
                                                    </span>
                                                    <button type="button" onClick={() => setSelectedId(block.id)} className="flex min-w-0 flex-1 items-center gap-2 text-left">
                                                        <span
                                                            className={cn(
                                                                'flex size-8 shrink-0 items-center justify-center rounded-lg',
                                                                active ? 'bg-white/15' : 'bg-brand/10 text-brand',
                                                            )}
                                                        >
                                                            <Icon className="size-4" />
                                                        </span>
                                                        <span className="min-w-0 flex-1">
                                                            <span className="block text-xs font-bold">
                                                                {index + 1}. {meta.label}
                                                            </span>
                                                            <span className={cn('block truncate text-[11px]', active ? 'text-white/70' : 'text-muted-foreground')}>
                                                                {stripHtml(block.settings.title || block.settings.badge) || (block.enabled ? '' : 'Oculto')}
                                                            </span>
                                                        </span>
                                                    </button>
                                                </div>
                                            )}
                                        </SortableRow>
                                    );
                                })}
                                {blocks.length === 0 && <p className="rounded-xl border border-dashed p-5 text-center text-xs text-muted-foreground">Agrega el primer bloque.</p>}
                            </div>
                        </SortableContext>
                    </DndContext>
                </Panel>

                <Panel title="Agregar bloque">
                    <div className="grid grid-cols-2 gap-2">
                        {BLOCK_ORDER.map((type) => {
                            const meta = BLOCK_META[type];
                            const Icon = meta.icon;

                            return (
                                <button
                                    key={type}
                                    type="button"
                                    title={meta.hint}
                                    onClick={() => addBlock(type)}
                                    className="inline-flex items-center gap-2 rounded-xl bg-muted/60 px-3 py-2 text-left text-xs font-bold transition hover:bg-brand hover:text-white"
                                >
                                    <Icon className="size-4 shrink-0" />
                                    {meta.label}
                                </button>
                            );
                        })}
                    </div>
                </Panel>
            </aside>

            <section className="min-w-0">
                {selected ? (
                    <div className={cn('rounded-2xl border bg-card', !selected.enabled && 'opacity-75')}>
                        <div className="flex flex-col gap-3 border-b p-4 sm:flex-row sm:items-center">
                            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand/10 text-brand">
                                {(() => {
                                    const Icon = BLOCK_META[selected.type].icon;

                                    return <Icon className="size-5" />;
                                })()}
                            </span>
                            <div className="min-w-0 flex-1">
                                <p className="text-sm font-bold">{BLOCK_META[selected.type].label}</p>
                                <p className="truncate text-xs text-muted-foreground">{BLOCK_META[selected.type].hint}</p>
                            </div>
                            <div className="flex flex-wrap gap-1.5">
                                <button
                                    type="button"
                                    onClick={() => patchBlock(selected.id, { enabled: !selected.enabled })}
                                    className="inline-flex items-center gap-1.5 rounded-lg bg-muted px-3 py-2 text-xs font-bold hover:bg-muted/70"
                                >
                                    {selected.enabled ? <ToggleRight className="size-4 text-emerald-600" /> : <ToggleLeft className="size-4" />}
                                    {selected.enabled ? 'Visible' : 'Oculto'}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => duplicateBlock(selected)}
                                    className="inline-flex items-center gap-1.5 rounded-lg bg-muted px-3 py-2 text-xs font-bold hover:bg-muted/70"
                                >
                                    <Copy className="size-4" /> Duplicar
                                </button>
                                <button
                                    type="button"
                                    onClick={() => removeBlock(selected)}
                                    className="inline-flex items-center gap-1.5 rounded-lg bg-red-50 px-3 py-2 text-xs font-bold text-red-600 hover:bg-red-100"
                                >
                                    <Trash2 className="size-4" /> Eliminar
                                </button>
                            </div>
                        </div>
                        {/* key: los editores de texto se reinician al cambiar de bloque. */}
                        <div key={selected.id} className="space-y-4 p-5">
                            <BlockSettings block={selected} patch={(value) => patchSettings(selected.id, value)} navOptions={navOptions} />
                        </div>
                    </div>
                ) : (
                    <div className="rounded-2xl border border-dashed p-12 text-center text-sm text-muted-foreground">
                        Agrega una sección para empezar a armar la página.
                    </div>
                )}
            </section>
        </div>
    );
}

// ── Campos por tipo de bloque ────────────────────────────────────────────────

function HeadingFields({ settings, patch, description = true }: { settings: Settings; patch: Patch; description?: boolean }) {
    return (
        <>
            <Field label="Antetítulo (opcional)">
                <TextInput value={settings.eyebrow ?? ''} maxLength={120} onChange={(event) => patch({ eyebrow: event.target.value })} />
            </Field>
            <RichTextField label="Título" value={settings.title ?? ''} onChange={(title) => patch({ title })} />
            {description && <RichTextField label="Descripción" value={settings.description ?? ''} onChange={(description) => patch({ description })} />}
        </>
    );
}

function OverlayFields({ settings, patch }: { settings: Settings; patch: Patch }) {
    const enabled = settings.overlay_enabled === true;

    return (
        <Details title="Capa de color sobre la imagen">
            <Toggle label="Aplicar capa" checked={enabled} onChange={(overlay_enabled) => patch({ overlay_enabled })} />
            {enabled && (
                <div className="grid gap-3 sm:grid-cols-2">
                    <ColorField label="Color" value={settings.overlay_color ?? ''} fallback="#160c19" onChange={(overlay_color) => patch({ overlay_color })} />
                    <Field label={`Opacidad (${settings.overlay_opacity ?? 45}%)`}>
                        <input
                            type="range"
                            min={0}
                            max={100}
                            value={settings.overlay_opacity ?? 45}
                            onChange={(event) => patch({ overlay_opacity: Number(event.target.value) })}
                            className="h-9 w-full accent-brand"
                        />
                    </Field>
                </div>
            )}
        </Details>
    );
}

function AppearanceFields({ settings, patch }: { settings: Settings; patch: Patch }) {
    return (
        <Details title="Apariencia de la sección">
            <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Fondo">
                    <Select value={settings.bg ?? 'auto'} onChange={(event) => patch({ bg: event.target.value })}>
                        <option value="auto">Automático</option>
                        <option value="white">Blanco</option>
                        <option value="soft">Suave</option>
                        <option value="primary">Primario</option>
                        <option value="secondary">Secundario</option>
                        <option value="accent">Acento</option>
                        <option value="custom">Color personalizado</option>
                        <option value="transparent">Transparente</option>
                    </Select>
                </Field>
                {settings.bg === 'custom' && (
                    <ColorField label="Color de fondo" value={settings.bg_color ?? ''} fallback="#ffffff" onChange={(bg_color) => patch({ bg_color })} />
                )}
                <Field label="Ancho">
                    <Select value={settings.section_width ?? 'container'} onChange={(event) => patch({ section_width: event.target.value })}>
                        <option value="container">Centrado</option>
                        <option value="full">Todo el ancho</option>
                    </Select>
                </Field>
            </div>
            <Field label="HTML personalizado (opcional)" hint="Se agrega al final de la sección tal cual: úsalo solo para insertar mapas o videos.">
                <TextArea rows={4} value={settings.custom_html ?? ''} onChange={(event) => patch({ custom_html: event.target.value })} className="font-mono text-xs" />
            </Field>
        </Details>
    );
}

function ButtonFields({ settings, patch, navOptions }: { settings: Settings; patch: Patch; navOptions: NavOptions }) {
    return (
        <div className="grid gap-4 sm:grid-cols-2">
            {(['primary', 'secondary'] as const).map((prefix) => (
                <div key={prefix} className="space-y-2">
                    <Field label={prefix === 'primary' ? 'Botón principal' : 'Botón secundario'} hint="Déjalo vacío para no mostrarlo.">
                        <TextInput value={settings[`${prefix}_label`] ?? ''} maxLength={80} onChange={(event) => patch({ [`${prefix}_label`]: event.target.value })} />
                    </Field>
                    <LinkSelector
                        value={{
                            label: settings[`${prefix}_label`] ?? '',
                            url: settings[`${prefix}_url`] ?? '',
                            link_type: (settings[`${prefix}_link_type`] ?? 'custom') as LinkType,
                            ref_id: settings[`${prefix}_ref_id`] ?? null,
                        }}
                        onChange={(link) =>
                            patch({
                                [`${prefix}_url`]: link.url,
                                [`${prefix}_link_type`]: link.link_type,
                                [`${prefix}_ref_id`]: link.ref_id ?? null,
                                [`${prefix}_label`]: settings[`${prefix}_label`] || link.label,
                            })
                        }
                        navOptions={navOptions}
                    />
                </div>
            ))}
        </div>
    );
}

/** Lista editable de elementos (tarjetas, fotos, pasos…). */
function ItemList({
    items,
    onChange,
    empty,
    addLabel,
    render,
}: {
    items: Settings[];
    onChange: (items: Settings[]) => void;
    empty: Settings;
    addLabel: string;
    render: (item: Settings, update: (value: Settings) => void, index: number) => ReactNode;
}) {
    const move = (index: number, direction: -1 | 1) => {
        const target = index + direction;

        if (target >= 0 && target < items.length) {
            onChange(arrayMove(items, index, target));
        }
    };

    return (
        <div className="space-y-3">
            {items.map((item, index) => (
                <div key={index} className="space-y-3 rounded-xl border bg-muted/20 p-3">
                    {render(item, (value) => onChange(items.map((current, i) => (i === index ? { ...current, ...value } : current))), index)}
                    <div className="flex gap-3 text-xs font-semibold">
                        <button type="button" onClick={() => move(index, -1)} disabled={index === 0} className="text-muted-foreground disabled:opacity-40">
                            Subir
                        </button>
                        <button type="button" onClick={() => move(index, 1)} disabled={index === items.length - 1} className="text-muted-foreground disabled:opacity-40">
                            Bajar
                        </button>
                        <button type="button" onClick={() => onChange(items.filter((_, i) => i !== index))} className="ml-auto text-red-600">
                            Eliminar
                        </button>
                    </div>
                </div>
            ))}
            <AddButton label={addLabel} onClick={() => onChange([...items, { ...empty }])} />
        </div>
    );
}

function ColumnsField({ settings, patch }: { settings: Settings; patch: Patch }) {
    return (
        <Field label="Columnas" hint="En escritorio. En celular se apilan.">
            <Select value={String(settings.columns ?? 3)} onChange={(event) => patch({ columns: Number(event.target.value) })}>
                <option value="2">2</option>
                <option value="3">3</option>
                <option value="4">4</option>
            </Select>
        </Field>
    );
}

function BlockSettings({ block, patch, navOptions }: { block: PageBlock; patch: Patch; navOptions: NavOptions }) {
    const s = block.settings;
    const list = (key: string) => (Array.isArray(s[key]) ? (s[key] as Settings[]) : []);

    switch (block.type) {
        case 'hero':
            return (
                <>
                    <div className="grid gap-4 lg:grid-cols-2">
                        <ImageField
                            label="Imagen"
                            value={s.image ?? ''}
                            onChange={(image) => patch({ image })}
                            onUploaded={(image) => patch({ image: image.url, image_width: image.width ?? null, image_height: image.height ?? null })}
                        />
                        <ImageField label="Imagen en celular (opcional, vertical)" value={s.image_mobile ?? ''} aspect="portrait" onChange={(image_mobile) => patch({ image_mobile })} />
                    </div>
                    <div className="grid gap-4 sm:grid-cols-3">
                        <Field label="Uso de la imagen">
                            <Select value={s.image_layout ?? 'background'} onChange={(event) => patch({ image_layout: event.target.value })}>
                                <option value="background">De fondo</option>
                                <option value="side">Al lado del texto (logo, globo)</option>
                            </Select>
                        </Field>
                        <Field label="Recorte">
                            <Select value={s.image_position ?? 'center'} onChange={(event) => patch({ image_position: event.target.value })}>
                                <option value="center">Centro</option>
                                <option value="center top">Arriba</option>
                                <option value="center bottom">Abajo</option>
                                <option value="left center">Izquierda</option>
                                <option value="right center">Derecha</option>
                            </Select>
                        </Field>
                        <Field label="Alineación del texto">
                            <Select value={s.align ?? 'center'} onChange={(event) => patch({ align: event.target.value })}>
                                <option value="left">Izquierda</option>
                                <option value="center">Centro</option>
                            </Select>
                        </Field>
                    </div>
                    <Field label="Texto alternativo de la imagen">
                        <TextInput value={s.image_alt ?? ''} maxLength={255} onChange={(event) => patch({ image_alt: event.target.value })} />
                    </Field>
                    <OverlayFields settings={s} patch={patch} />
                    <Field label="Etiqueta superior (opcional)">
                        <TextInput value={s.badge ?? ''} maxLength={120} onChange={(event) => patch({ badge: event.target.value })} />
                    </Field>
                    <RichTextField label="Título" value={s.title ?? ''} onChange={(title) => patch({ title })} />
                    <RichTextField label="Subtítulo" value={s.subtitle ?? ''} onChange={(subtitle) => patch({ subtitle })} />
                    <ButtonFields settings={s} patch={patch} navOptions={navOptions} />
                </>
            );

        case 'rich_text':
            return (
                <>
                    <div className="grid gap-4 sm:grid-cols-2">
                        <Field label="Antetítulo (opcional)">
                            <TextInput value={s.eyebrow ?? ''} maxLength={120} onChange={(event) => patch({ eyebrow: event.target.value })} />
                        </Field>
                        <Field label="Ancho">
                            <Select value={s.width ?? 'normal'} onChange={(event) => patch({ width: event.target.value })}>
                                <option value="normal">Normal</option>
                                <option value="wide">Amplio</option>
                            </Select>
                        </Field>
                    </div>
                    <RichTextField label="Título" value={s.title ?? ''} onChange={(title) => patch({ title })} />
                    <RichTextField label="Contenido" value={s.body ?? ''} onChange={(body) => patch({ body })} full />
                    <AppearanceFields settings={s} patch={patch} />
                </>
            );

        case 'image':
            return (
                <>
                    <ImageField label="Imagen" value={s.image ?? ''} onChange={(image) => patch({ image })} />
                    <div className="grid gap-4 sm:grid-cols-2">
                        <Field label="Diseño">
                            <Select value={s.layout ?? 'wide'} onChange={(event) => patch({ layout: event.target.value })}>
                                <option value="wide">Imagen amplia</option>
                                <option value="split">Texto e imagen</option>
                            </Select>
                        </Field>
                        <Field label="Texto alternativo">
                            <TextInput value={s.alt ?? ''} maxLength={255} onChange={(event) => patch({ alt: event.target.value })} />
                        </Field>
                    </div>
                    <OverlayFields settings={s} patch={patch} />
                    <HeadingFields settings={s} patch={patch} />
                    <AppearanceFields settings={s} patch={patch} />
                </>
            );

        case 'image_cards':
            return (
                <>
                    <HeadingFields settings={s} patch={patch} />
                    <div className="grid gap-4 sm:grid-cols-2">
                        <Field label="Posición del texto">
                            <Select value={s.text_position === 'top' ? 'top' : 'bottom'} onChange={(event) => patch({ text_position: event.target.value })}>
                                <option value="bottom">Debajo de la imagen</option>
                                <option value="top">Arriba de la imagen</option>
                            </Select>
                        </Field>
                        <ColumnsField settings={s} patch={patch} />
                    </div>
                    <ItemList
                        items={list('items')}
                        onChange={(items) => patch({ items })}
                        empty={{ image: '', alt: '', icon: '', title: '', desc: '' }}
                        addLabel="Agregar tarjeta"
                        render={(item, update, index) => (
                            <div className="grid gap-3 sm:grid-cols-[200px_1fr]">
                                <ImageField label={`Imagen ${index + 1}`} value={item.image ?? ''} onChange={(image) => update({ image })} />
                                <div className="space-y-3">
                                    <div className="grid gap-3 sm:grid-cols-[150px_1fr]">
                                        <IconPicker label="Icono (opcional)" allowEmpty value={item.icon} onChange={(icon) => update({ icon })} />
                                        <Field label="Título">
                                            <TextInput value={item.title ?? ''} onChange={(event) => update({ title: event.target.value })} />
                                        </Field>
                                    </div>
                                    <Field label="Descripción">
                                        <TextArea rows={3} value={item.desc ?? ''} onChange={(event) => update({ desc: event.target.value })} />
                                    </Field>
                                    <Field label="Texto alternativo">
                                        <TextInput value={item.alt ?? ''} onChange={(event) => update({ alt: event.target.value })} />
                                    </Field>
                                </div>
                            </div>
                        )}
                    />
                    <AppearanceFields settings={s} patch={patch} />
                </>
            );

        case 'image_features':
            return (
                <>
                    <ImageField label="Imagen" value={s.image ?? ''} onChange={(image) => patch({ image })} />
                    <div className="grid gap-4 sm:grid-cols-2">
                        <Field label="Lado de la imagen" hint="En celular la imagen va arriba.">
                            <Select value={s.image_side === 'right' ? 'right' : 'left'} onChange={(event) => patch({ image_side: event.target.value })}>
                                <option value="left">Izquierda</option>
                                <option value="right">Derecha</option>
                            </Select>
                        </Field>
                        <Field label="Texto alternativo">
                            <TextInput value={s.alt ?? ''} onChange={(event) => patch({ alt: event.target.value })} />
                        </Field>
                    </div>
                    <HeadingFields settings={s} patch={patch} />
                    <Details title="Tarjeta sobre la imagen (opcional)">
                        <div className="grid gap-3 sm:grid-cols-[150px_1fr]">
                            <IconPicker label="Icono" value={s.card_icon} onChange={(card_icon) => patch({ card_icon })} />
                            <Field label="Título">
                                <TextInput value={s.card_title ?? ''} onChange={(event) => patch({ card_title: event.target.value })} />
                            </Field>
                        </div>
                        <Field label="Descripción" hint="Sin título ni descripción, la tarjeta no se muestra.">
                            <TextArea rows={2} value={s.card_desc ?? ''} onChange={(event) => patch({ card_desc: event.target.value })} />
                        </Field>
                    </Details>
                    <FeatureItems items={list('items')} onChange={(items) => patch({ items })} addLabel="Agregar característica" />
                    <AppearanceFields settings={s} patch={patch} />
                </>
            );

        case 'gallery': {
            const images = list('images');

            return (
                <>
                    <HeadingFields settings={s} patch={patch} />
                    <Field label="Diseño" hint="Todos abren la foto a pantalla completa.">
                        <Select value={s.layout ?? 'grid'} onChange={(event) => patch({ layout: event.target.value })}>
                            <option value="grid">Cuadrícula</option>
                            <option value="carousel">Carrusel</option>
                            <option value="pdp">Mosaico (primeras 5)</option>
                        </Select>
                    </Field>
                    <OverlayFields settings={s} patch={patch} />
                    <BulkImageUpload onAdd={(urls) => patch({ images: [...images, ...urls.map((image) => ({ image, caption: '' }))] })} />
                    <ItemList
                        items={images}
                        onChange={(value) => patch({ images: value })}
                        empty={{ image: '', caption: '' }}
                        addLabel="Agregar foto"
                        render={(item, update, index) => (
                            <div className="grid gap-3 sm:grid-cols-[200px_1fr]">
                                <ImageField label={`Foto ${index + 1}`} value={item.image ?? ''} onChange={(image) => update({ image })} />
                                <Field label="Pie de foto (opcional)">
                                    <TextInput value={item.caption ?? ''} maxLength={200} onChange={(event) => update({ caption: event.target.value })} />
                                </Field>
                            </div>
                        )}
                    />
                    <AppearanceFields settings={s} patch={patch} />
                </>
            );
        }

        case 'stats':
            return (
                <>
                    <HeadingFields settings={s} patch={patch} />
                    <ItemList
                        items={list('items')}
                        onChange={(items) => patch({ items })}
                        empty={{ value: '', label: '' }}
                        addLabel="Agregar cifra"
                        render={(item, update) => (
                            <div className="grid gap-3 sm:grid-cols-[160px_1fr]">
                                <Field label="Cifra">
                                    <TextInput value={item.value ?? ''} maxLength={40} placeholder="+15,000" onChange={(event) => update({ value: event.target.value })} />
                                </Field>
                                <Field label="Etiqueta">
                                    <TextInput value={item.label ?? ''} maxLength={120} placeholder="pasajeros al año" onChange={(event) => update({ label: event.target.value })} />
                                </Field>
                            </div>
                        )}
                    />
                    <AppearanceFields settings={s} patch={patch} />
                </>
            );

        case 'why_us':
            return (
                <>
                    <HeadingFields settings={s} patch={patch} />
                    <ColumnsField settings={s} patch={patch} />
                    <FeatureItems items={list('items')} onChange={(items) => patch({ items })} addLabel="Agregar tarjeta" />
                    <AppearanceFields settings={s} patch={patch} />
                </>
            );

        case 'process':
            return (
                <>
                    <HeadingFields settings={s} patch={patch} />
                    <ItemList
                        items={list('steps')}
                        onChange={(steps) => patch({ steps })}
                        empty={{ n: '', icon: 'Plane', title: '', desc: '' }}
                        addLabel="Agregar paso"
                        render={(item, update, index) => (
                            <>
                                <div className="grid gap-3 sm:grid-cols-[80px_150px_1fr]">
                                    <Field label="No.">
                                        <TextInput value={item.n ?? String(index + 1).padStart(2, '0')} maxLength={20} onChange={(event) => update({ n: event.target.value })} />
                                    </Field>
                                    <IconPicker label="Icono" fallback="Plane" value={item.icon} onChange={(icon) => update({ icon })} />
                                    <Field label="Título">
                                        <TextInput value={item.title ?? ''} onChange={(event) => update({ title: event.target.value })} />
                                    </Field>
                                </div>
                                <Field label="Descripción">
                                    <TextArea rows={2} value={item.desc ?? ''} onChange={(event) => update({ desc: event.target.value })} />
                                </Field>
                            </>
                        )}
                    />
                    <AppearanceFields settings={s} patch={patch} />
                </>
            );

        case 'testimonials':
            return (
                <>
                    <HeadingFields settings={s} patch={patch} description={false} />
                    <ItemList
                        items={list('items')}
                        onChange={(items) => patch({ items })}
                        empty={{ name: '', role: '', text: '', avatar: '' }}
                        addLabel="Agregar testimonio"
                        render={(item, update, index) => (
                            <div className="grid gap-3 sm:grid-cols-[160px_1fr]">
                                <ImageField label={`Foto ${index + 1}`} value={item.avatar ?? ''} aspect="portrait" onChange={(avatar) => update({ avatar })} />
                                <div className="space-y-3">
                                    <div className="grid gap-3 sm:grid-cols-2">
                                        <Field label="Nombre">
                                            <TextInput value={item.name ?? ''} onChange={(event) => update({ name: event.target.value })} />
                                        </Field>
                                        <Field label="Cargo o ciudad">
                                            <TextInput value={item.role ?? ''} onChange={(event) => update({ role: event.target.value })} />
                                        </Field>
                                    </div>
                                    <Field label="Testimonio">
                                        <TextArea rows={3} value={item.text ?? ''} onChange={(event) => update({ text: event.target.value })} />
                                    </Field>
                                </div>
                            </div>
                        )}
                    />
                    <AppearanceFields settings={s} patch={patch} />
                </>
            );

        case 'cta':
            return (
                <>
                    <ImageField label="Imagen (opcional)" value={s.image ?? ''} onChange={(image) => patch({ image })} />
                    <OverlayFields settings={s} patch={patch} />
                    <Field label="Etiqueta superior (opcional)">
                        <TextInput value={s.badge ?? ''} maxLength={120} onChange={(event) => patch({ badge: event.target.value })} />
                    </Field>
                    <RichTextField label="Título" value={s.title ?? ''} onChange={(title) => patch({ title })} />
                    <RichTextField label="Descripción" value={s.description ?? ''} onChange={(description) => patch({ description })} />
                    <ButtonFields settings={s} patch={patch} navOptions={navOptions} />
                    <AppearanceFields settings={s} patch={patch} />
                </>
            );

        case 'faqs':
            return (
                <>
                    <HeadingFields settings={s} patch={patch} />
                    <ItemList
                        items={list('items')}
                        onChange={(items) => patch({ items })}
                        empty={{ question: 'Nueva pregunta', answer: '' }}
                        addLabel="Agregar pregunta"
                        render={(item, update) => (
                            <>
                                <Field label="Pregunta">
                                    <TextInput value={item.question ?? ''} onChange={(event) => update({ question: event.target.value })} />
                                </Field>
                                <Field label="Respuesta">
                                    <TextArea rows={3} value={item.answer ?? ''} onChange={(event) => update({ answer: event.target.value })} />
                                </Field>
                            </>
                        )}
                    />
                    <AppearanceFields settings={s} patch={patch} />
                </>
            );

        case 'posts':
            return (
                <>
                    <HeadingFields settings={s} patch={patch} />
                    <div className="grid gap-4 sm:grid-cols-2">
                        <Field label="Cuántas publicaciones">
                            <Select value={String(s.limit ?? 3)} onChange={(event) => patch({ limit: Number(event.target.value) })}>
                                {[3, 6, 9].map((n) => (
                                    <option key={n} value={n}>
                                        {n}
                                    </option>
                                ))}
                            </Select>
                        </Field>
                        <Field label="Texto del botón">
                            <TextInput value={s.button_label ?? ''} maxLength={80} onChange={(event) => patch({ button_label: event.target.value })} />
                        </Field>
                    </div>
                    <p className="text-xs text-muted-foreground">Si el blog no tiene publicaciones, el bloque no se muestra.</p>
                    <AppearanceFields settings={s} patch={patch} />
                </>
            );

        case 'contact':
            return (
                <>
                    <HeadingFields settings={s} patch={patch} />
                    <Toggle
                        label="Mostrar datos de contacto junto al formulario"
                        description="Correo, teléfonos, horario, dirección y redes: se editan en Sitio público → Contacto."
                        checked={s.show_details !== false}
                        onChange={(show_details) => patch({ show_details })}
                    />
                    <div className="grid gap-4 sm:grid-cols-2">
                        <Field label="Texto del botón">
                            <TextInput value={s.submit_label ?? ''} maxLength={80} onChange={(event) => patch({ submit_label: event.target.value })} />
                        </Field>
                        <Field label="Mensaje al enviar">
                            <TextInput value={s.success_message ?? ''} maxLength={200} onChange={(event) => patch({ success_message: event.target.value })} />
                        </Field>
                    </div>
                    <AppearanceFields settings={s} patch={patch} />
                </>
            );

        default:
            // Semáforo, clima y asociados: el contenido viene del sistema; solo se edita el encabezado.
            return (
                <>
                    <p className="rounded-lg bg-muted px-3 py-2 text-xs text-muted-foreground">{BLOCK_META[block.type].hint}</p>
                    <HeadingFields settings={s} patch={patch} />
                    <AppearanceFields settings={s} patch={patch} />
                </>
            );
    }
}

function FeatureItems({ items, onChange, addLabel }: { items: Settings[]; onChange: (items: Settings[]) => void; addLabel: string }) {
    return (
        <ItemList
            items={items}
            onChange={onChange}
            empty={{ icon: 'Shield', title: '', desc: '' }}
            addLabel={addLabel}
            render={(item, update) => (
                <>
                    <div className="grid gap-3 sm:grid-cols-[150px_1fr]">
                        <IconPicker label="Icono" value={item.icon} onChange={(icon) => update({ icon })} />
                        <Field label="Título">
                            <TextInput value={item.title ?? ''} onChange={(event) => update({ title: event.target.value })} />
                        </Field>
                    </div>
                    <Field label="Descripción">
                        <TextArea rows={2} value={item.desc ?? ''} onChange={(event) => update({ desc: event.target.value })} />
                    </Field>
                </>
            )}
        />
    );
}
