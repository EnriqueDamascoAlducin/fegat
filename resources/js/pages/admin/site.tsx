import { Form, Head, router } from '@inertiajs/react';
import { AlignCenter, AlignLeft, ChevronDown, ExternalLink, Eye, EyeOff, MoveDown, MoveUp, Trash2 } from 'lucide-react';
import { useState } from 'react';
import type { ElementType, ReactNode } from 'react';
import Heading from '@/components/heading';
import InputError from '@/components/input-error';
import { AddButton, ColorField, Field, ImageField, LinkSelector, Select, TextArea, TextInput, Toggle } from '@/components/site/editor-fields';
import { Button } from '@/components/ui/button';
import { uid } from '@/lib/site-blocks';
import { cn } from '@/lib/utils';
import { contact as contactRoute, edit, footer as footerRoute, header as headerRoute } from '@/routes/admin/site';
import type { ContactDetails, FooterColumn, FooterData, FooterLink, HeaderData, NavChild, NavItem, NavOptions, SiteLink } from '@/types/site';

type Props = {
    header: HeaderData;
    footer: FooterData;
    contact: ContactDetails;
    navOptions: NavOptions;
};

const TABS = [
    { id: 'header', label: 'Header y menú' },
    { id: 'footer', label: 'Footer' },
    { id: 'contact', label: 'Contacto y redes' },
] as const;

const CTA_ICONS = ['ArrowRight', 'Calendar', 'Clock', 'Gift', 'Heart', 'Mail', 'MapPin', 'MessageCircle', 'Phone', 'Star', 'Zap'];

function IconButton({ icon: Icon, onClick, title, danger = false, active = false }: { icon: ElementType; onClick: () => void; title: string; danger?: boolean; active?: boolean }) {
    return (
        <button
            type="button"
            onClick={onClick}
            title={title}
            aria-label={title}
            className={cn(
                'flex size-8 items-center justify-center rounded-lg border transition',
                danger ? 'border-red-200 text-red-500 hover:bg-red-50' : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                active && 'border-brand bg-brand/10 text-brand',
            )}
        >
            <Icon className="size-4" />
        </button>
    );
}

function Section({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
    return (
        <section className="space-y-4 rounded-2xl border p-5">
            <div>
                <h3 className="font-medium">{title}</h3>
                {description && <p className="text-sm text-muted-foreground">{description}</p>}
            </div>
            {children}
        </section>
    );
}

function useSaver(url: string) {
    const [saving, setSaving] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});

    const save = (data: object) => {
        setSaving(true);
        router.put(url, data as never, {
            preserveScroll: true,
            preserveState: true,
            onSuccess: () => setErrors({}),
            onError: setErrors,
            onFinish: () => setSaving(false),
        });
    };

    return { saving, errors, save };
}

function ErrorList({ errors }: { errors: Record<string, string> }) {
    const messages = [...new Set(Object.values(errors))];

    return messages.length > 0 ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {messages.map((message) => (
                <p key={message}>{message}</p>
            ))}
        </div>
    ) : null;
}

const moved = <T,>(list: T[], index: number, direction: -1 | 1): T[] => {
    const target = index + direction;

    if (target < 0 || target >= list.length) {
        return list;
    }

    const next = [...list];
    [next[index], next[target]] = [next[target], next[index]];

    return next;
};

function HeaderPanel({ initial, navOptions }: { initial: HeaderData; navOptions: NavOptions }) {
    const [data, setData] = useState(initial);
    const [expanded, setExpanded] = useState<Set<string>>(new Set());
    const { saving, errors, save } = useSaver(headerRoute.url());
    const set = (patch: Partial<HeaderData>) => setData((current) => ({ ...current, ...patch }));
    const updateItem = (id: string, patch: Partial<NavItem>) => set({ nav_items: data.nav_items.map((item) => (item.id === id ? { ...item, ...patch } : item)) });
    const toggle = (id: string) =>
        setExpanded((current) => {
            const next = new Set(current);

            if (!next.delete(id)) {
                next.add(id);
            }

            return next;
        });

    const linkChange = (link: SiteLink, current: SiteLink) => ({ url: link.url, link_type: link.link_type, ref_id: link.ref_id ?? null, label: current.label || link.label });

    return (
        <div className="space-y-5">
            <Section title="Apariencia" description="Logo, colores y comportamiento al hacer scroll.">
                <div className="grid gap-5 lg:grid-cols-2">
                    <ImageField label="Logo (si no subes uno se usa el texto FEGAT)" value={data.logo} aspect="logo" onChange={(logo) => set({ logo })} />
                    <div className="space-y-4">
                        <Field label="Posición del logo">
                            <div className="flex gap-2">
                                {(
                                    [
                                        { value: 'left', label: 'Izquierda', Icon: AlignLeft },
                                        { value: 'center', label: 'Centro', Icon: AlignCenter },
                                    ] as const
                                ).map(({ value, label, Icon }) => (
                                    <button
                                        key={value}
                                        type="button"
                                        onClick={() => set({ logo_position: value })}
                                        className={cn(
                                            'flex items-center gap-2 rounded-lg border px-4 py-2 text-xs font-medium',
                                            data.logo_position === value ? 'border-brand bg-brand text-white' : 'hover:bg-muted',
                                        )}
                                    >
                                        <Icon className="size-3.5" /> {label}
                                    </button>
                                ))}
                            </div>
                        </Field>
                        <Field label={`Tamaño del logo (${data.logo_size}px)`}>
                            <input
                                type="range"
                                min={28}
                                max={60}
                                value={data.logo_size}
                                onChange={(event) => set({ logo_size: Number(event.target.value) })}
                                className="h-9 w-full accent-brand"
                            />
                        </Field>
                    </div>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                    <ColorField label="Fondo del header" value={data.background_color} fallback="#6c0ea3" onChange={(background_color) => set({ background_color })} />
                    <ColorField label="Texto del header" value={data.text_color} fallback="#ffffff" onChange={(text_color) => set({ text_color })} />
                </div>
                <div className="flex items-center justify-between rounded-xl px-4 py-3" style={{ backgroundColor: data.background_color, color: data.text_color }}>
                    <span className="font-display tracking-[0.3em]">FEGAT</span>
                    <span className="flex gap-4 text-sm">
                        {data.nav_items.slice(0, 4).map((item) => (
                            <span key={item.id}>{item.label || '…'}</span>
                        ))}
                    </span>
                </div>
                <div className="grid gap-x-6 sm:grid-cols-2">
                    <Toggle label="Header fijo" description="Permanece visible al hacer scroll." checked={data.sticky} onChange={(sticky) => set({ sticky })} />
                    <Toggle
                        label="Transparente en el inicio"
                        description="Empieza transparente sobre el hero y se rellena al bajar."
                        checked={data.transparent_home}
                        onChange={(transparent_home) => set({ transparent_home })}
                    />
                    <Toggle label="Barra «Powered by My Flight»" checked={data.show_ticker} onChange={(show_ticker) => set({ show_ticker })} />
                    <Toggle
                        label="Botón «Acceso empresas»"
                        description="Lleva al inicio de sesión del panel."
                        checked={data.show_access_button}
                        onChange={(show_access_button) => set({ show_access_button })}
                    />
                </div>
            </Section>

            <Section title="Menú de navegación" description="Elige el destino de cada opción: una página, el blog, un artículo o una URL. Agrega sub-links para un menú desplegable.">
                {data.nav_items.length === 0 && <p className="rounded-xl border border-dashed py-6 text-center text-sm text-muted-foreground">Sin opciones. Agrega la primera.</p>}
                <div className="space-y-2">
                    {data.nav_items.map((item, index) => (
                        <div key={item.id} className={cn('rounded-xl border', !item.visible && 'opacity-60')}>
                            <div className="flex flex-wrap items-start gap-2 p-3">
                                <div className="min-w-0 flex-1 space-y-1.5">
                                    <TextInput value={item.label} maxLength={80} placeholder="Texto en el menú" onChange={(event) => updateItem(item.id, { label: event.target.value })} />
                                    <LinkSelector value={item} navOptions={navOptions} onChange={(link) => updateItem(item.id, linkChange(link, item))} />
                                </div>
                                <div className="flex shrink-0 gap-1">
                                    <IconButton icon={item.visible ? Eye : EyeOff} title={item.visible ? 'Ocultar' : 'Mostrar'} onClick={() => updateItem(item.id, { visible: !item.visible })} />
                                    <IconButton
                                        icon={ExternalLink}
                                        title="Abrir en pestaña nueva"
                                        active={item.open_in_new_tab}
                                        onClick={() => updateItem(item.id, { open_in_new_tab: !item.open_in_new_tab })}
                                    />
                                    <IconButton icon={MoveUp} title="Subir" onClick={() => set({ nav_items: moved(data.nav_items, index, -1) })} />
                                    <IconButton icon={MoveDown} title="Bajar" onClick={() => set({ nav_items: moved(data.nav_items, index, 1) })} />
                                    <button
                                        type="button"
                                        onClick={() => toggle(item.id)}
                                        className={cn('flex h-8 items-center gap-1 rounded-lg border px-2 text-xs font-medium', item.children.length > 0 && 'border-brand text-brand')}
                                    >
                                        <ChevronDown className={cn('size-3 transition-transform', expanded.has(item.id) && 'rotate-180')} />
                                        Sub {item.children.length > 0 && item.children.length}
                                    </button>
                                    <IconButton icon={Trash2} title="Eliminar" danger onClick={() => set({ nav_items: data.nav_items.filter((current) => current.id !== item.id) })} />
                                </div>
                            </div>
                            {expanded.has(item.id) && (
                                <div className="space-y-3 border-t bg-muted/30 p-3">
                                    <p className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">Sub-links (menú desplegable)</p>
                                    {item.children.map((child) => {
                                        const updateChild = (patch: Partial<NavChild>) =>
                                            updateItem(item.id, { children: item.children.map((current) => (current.id === child.id ? { ...current, ...patch } : current)) });

                                        return (
                                            <div key={child.id} className="flex items-start gap-2">
                                                <div className="min-w-0 flex-1 space-y-1.5">
                                                    <TextInput value={child.label} maxLength={80} placeholder="Texto" onChange={(event) => updateChild({ label: event.target.value })} />
                                                    <LinkSelector value={child} navOptions={navOptions} onChange={(link) => updateChild(linkChange(link, child))} />
                                                </div>
                                                <IconButton
                                                    icon={Trash2}
                                                    title="Eliminar sub-link"
                                                    danger
                                                    onClick={() => updateItem(item.id, { children: item.children.filter((current) => current.id !== child.id) })}
                                                />
                                            </div>
                                        );
                                    })}
                                    <AddButton
                                        label="Agregar sub-link"
                                        onClick={() =>
                                            updateItem(item.id, {
                                                children: [...item.children, { id: uid('sub'), label: '', url: '', link_type: 'page', ref_id: null, open_in_new_tab: false }],
                                            })
                                        }
                                    />
                                </div>
                            )}
                        </div>
                    ))}
                </div>
                <AddButton
                    label="Agregar opción al menú"
                    onClick={() => {
                        const id = uid('nav');
                        set({ nav_items: [...data.nav_items, { id, label: '', url: '', link_type: 'page', ref_id: null, open_in_new_tab: false, visible: true, children: [] }] });
                    }}
                />
            </Section>

            <Section title="Botón de acción" description="Botón destacado a la derecha del menú (por ejemplo «Donar»).">
                <Toggle label="Mostrar botón" checked={data.cta.enabled} onChange={(enabled) => set({ cta: { ...data.cta, enabled } })} />
                {data.cta.enabled && (
                    <div className="grid gap-4 sm:grid-cols-2">
                        <Field label="Contenido">
                            <Select value={data.cta.content_type} onChange={(event) => set({ cta: { ...data.cta, content_type: event.target.value as 'text' | 'icon' } })}>
                                <option value="text">Texto</option>
                                <option value="icon">Solo icono</option>
                            </Select>
                        </Field>
                        {data.cta.content_type === 'icon' ? (
                            <Field label="Icono">
                                <Select value={data.cta.icon} onChange={(event) => set({ cta: { ...data.cta, icon: event.target.value } })}>
                                    <option value="">Elige un icono</option>
                                    {CTA_ICONS.map((icon) => (
                                        <option key={icon} value={icon}>
                                            {icon}
                                        </option>
                                    ))}
                                </Select>
                            </Field>
                        ) : (
                            <Field label="Texto del botón">
                                <TextInput value={data.cta.label} maxLength={80} placeholder="Donar" onChange={(event) => set({ cta: { ...data.cta, label: event.target.value } })} />
                            </Field>
                        )}
                        <Field label="Destino" className="sm:col-span-2">
                            <LinkSelector value={data.cta} navOptions={navOptions} onChange={(link) => set({ cta: { ...data.cta, ...linkChange(link, data.cta) } })} />
                        </Field>
                        <Toggle
                            label="Abrir en pestaña nueva"
                            checked={data.cta.open_in_new_tab ?? false}
                            onChange={(open_in_new_tab) => set({ cta: { ...data.cta, open_in_new_tab } })}
                        />
                    </div>
                )}
            </Section>

            <ErrorList errors={errors} />
            <Button onClick={() => save(data)} disabled={saving}>
                {saving ? 'Guardando…' : 'Guardar header'}
            </Button>
        </div>
    );
}

function FooterPanel({ initial, navOptions }: { initial: FooterData; navOptions: NavOptions }) {
    const [data, setData] = useState(initial);
    const { saving, errors, save } = useSaver(footerRoute.url());
    const set = (patch: Partial<FooterData>) => setData((current) => ({ ...current, ...patch }));
    const updateColumn = (id: string, patch: Partial<FooterColumn>) => set({ columns: data.columns.map((column) => (column.id === id ? { ...column, ...patch } : column)) });

    return (
        <div className="space-y-5">
            <Section title="General" description="Textos, colores y qué mostrar.">
                <Field label="Descripción" hint="Aparece bajo el logo.">
                    <TextArea rows={2} maxLength={500} value={data.description} onChange={(event) => set({ description: event.target.value })} />
                </Field>
                <Field label="Texto de copyright" hint="Se antepone el año actual.">
                    <TextInput
                        value={data.copyright}
                        maxLength={255}
                        placeholder="FEGAT · Federación de Globos Aerostáticos Teotihuacán A.C."
                        onChange={(event) => set({ copyright: event.target.value })}
                    />
                </Field>
                <div className="grid gap-4 sm:grid-cols-2">
                    <ColorField label="Fondo del footer" value={data.background_color} fallback="#2b0645" onChange={(background_color) => set({ background_color })} />
                    <ColorField label="Texto del footer" value={data.text_color} fallback="#ffffff" onChange={(text_color) => set({ text_color })} />
                </div>
                <div className="rounded-xl px-4 py-3 text-sm" style={{ backgroundColor: data.background_color, color: data.text_color }}>
                    <p className="font-display tracking-[0.3em]">FEGAT</p>
                    <p className="mt-1 opacity-70">{data.description || 'Descripción'}</p>
                </div>
                <div className="grid gap-x-6 sm:grid-cols-2">
                    <Toggle
                        label="Mostrar redes sociales"
                        description="Las de la pestaña Contacto y redes."
                        checked={data.show_socials}
                        onChange={(show_socials) => set({ show_socials })}
                    />
                    <Toggle label="Mostrar correo y teléfonos" checked={data.show_contact} onChange={(show_contact) => set({ show_contact })} />
                </div>
            </Section>

            <Section title="Columnas de links" description="Hasta 6 columnas con sus enlaces.">
                <div className="grid gap-4 md:grid-cols-2">
                    {data.columns.map((column, index) => {
                        const updateLink = (id: string, patch: Partial<FooterLink>) => updateColumn(column.id, { links: column.links.map((link) => (link.id === id ? { ...link, ...patch } : link)) });

                        return (
                            <div key={column.id} className="space-y-3 rounded-xl border p-4">
                                <div className="flex items-end gap-2">
                                    <Field label="Título de la columna" className="flex-1">
                                        <TextInput value={column.title} maxLength={80} placeholder="La federación" onChange={(event) => updateColumn(column.id, { title: event.target.value })} />
                                    </Field>
                                    <IconButton icon={MoveUp} title="Mover antes" onClick={() => set({ columns: moved(data.columns, index, -1) })} />
                                    <IconButton icon={Trash2} title="Eliminar columna" danger onClick={() => set({ columns: data.columns.filter((current) => current.id !== column.id) })} />
                                </div>
                                {column.links.map((link) => (
                                    <div key={link.id} className="space-y-1.5 border-t pt-3">
                                        <div className="flex gap-1.5">
                                            <TextInput value={link.label} maxLength={80} placeholder="Texto" onChange={(event) => updateLink(link.id, { label: event.target.value })} />
                                            <IconButton
                                                icon={ExternalLink}
                                                title="Abrir en pestaña nueva"
                                                active={link.open_in_new_tab}
                                                onClick={() => updateLink(link.id, { open_in_new_tab: !link.open_in_new_tab })}
                                            />
                                            <IconButton
                                                icon={Trash2}
                                                title="Eliminar link"
                                                danger
                                                onClick={() => updateColumn(column.id, { links: column.links.filter((current) => current.id !== link.id) })}
                                            />
                                        </div>
                                        <LinkSelector
                                            value={link}
                                            navOptions={navOptions}
                                            onChange={(value) =>
                                                updateLink(link.id, { url: value.url, link_type: value.link_type, ref_id: value.ref_id ?? null, label: link.label || value.label })
                                            }
                                        />
                                    </div>
                                ))}
                                <AddButton
                                    label="Agregar link"
                                    onClick={() =>
                                        updateColumn(column.id, {
                                            links: [...column.links, { id: uid('link'), label: '', url: '', link_type: 'page', ref_id: null, open_in_new_tab: false }],
                                        })
                                    }
                                />
                            </div>
                        );
                    })}
                </div>
                {data.columns.length < 6 && <AddButton label="Agregar columna" onClick={() => set({ columns: [...data.columns, { id: uid('col'), title: '', links: [] }] })} />}
            </Section>

            <ErrorList errors={errors} />
            <Button onClick={() => save(data)} disabled={saving}>
                {saving ? 'Guardando…' : 'Guardar footer'}
            </Button>
        </div>
    );
}

const CONTACT_FIELDS: { name: keyof ContactDetails; label: string; type?: string; placeholder?: string; max?: number }[] = [
    { name: 'contact_email', label: 'Correo institucional', type: 'email', placeholder: 'contacto@fegat.mx' },
    { name: 'contact_phones', label: 'Teléfonos', placeholder: '594 123 4567 · 55 1234 5678' },
    { name: 'contact_hours', label: 'Horario de atención', placeholder: 'Lunes a viernes de 9:00 a 17:00' },
    { name: 'contact_address', label: 'Dirección de la oficina', max: 500 },
    { name: 'map_url', label: 'Enlace de Google Maps', type: 'url', placeholder: 'https://maps.app.goo.gl/…', max: 1000 },
    { name: 'facebook_url', label: 'Facebook', type: 'url', placeholder: 'https://' },
    { name: 'instagram_url', label: 'Instagram', type: 'url', placeholder: 'https://' },
    { name: 'tiktok_url', label: 'TikTok', type: 'url', placeholder: 'https://' },
    { name: 'youtube_url', label: 'YouTube', type: 'url', placeholder: 'https://' },
];

function ContactPanel({ contact }: { contact: ContactDetails }) {
    return (
        <Form {...contactRoute.form()} options={{ preserveScroll: true }} className="space-y-5">
            {({ processing, errors }) => (
                <Section title="Datos de contacto y redes" description="Los usan el bloque «Contacto» de las páginas y el footer. Deja vacío lo que no quieras publicar.">
                    <div className="grid gap-4 sm:grid-cols-2">
                        {CONTACT_FIELDS.map((field) => (
                            <Field key={field.name} label={field.label} className={field.name === 'contact_address' ? 'sm:col-span-2' : undefined}>
                                <TextInput
                                    name={field.name}
                                    type={field.type ?? 'text'}
                                    maxLength={field.max ?? 255}
                                    placeholder={field.placeholder}
                                    defaultValue={contact[field.name] ?? ''}
                                />
                                <InputError message={errors[field.name]} />
                            </Field>
                        ))}
                    </div>
                    <Button disabled={processing}>{processing ? 'Guardando…' : 'Guardar contacto'}</Button>
                </Section>
            )}
        </Form>
    );
}

export default function Site({ header, footer, contact, navOptions }: Props) {
    const [tab, setTab] = useState<(typeof TABS)[number]['id']>('header');

    return (
        <>
            <Head title="Sitio público" />

            <div className="max-w-5xl space-y-6 p-4">
                <Heading title="Sitio público" description="Header con el menú, footer y datos de contacto, iguales en todas las páginas." />

                <div role="tablist" aria-label="Secciones" className="flex flex-wrap gap-2">
                    {TABS.map((item) => (
                        <Button key={item.id} type="button" role="tab" aria-selected={tab === item.id} variant={tab === item.id ? 'default' : 'outline'} size="sm" onClick={() => setTab(item.id)}>
                            {item.label}
                        </Button>
                    ))}
                </div>

                {tab === 'header' && <HeaderPanel initial={header} navOptions={navOptions} />}
                {tab === 'footer' && <FooterPanel initial={footer} navOptions={navOptions} />}
                {tab === 'contact' && <ContactPanel contact={contact} />}
            </div>
        </>
    );
}

Site.layout = {
    breadcrumbs: [{ title: 'Sitio público', href: edit() }],
};
