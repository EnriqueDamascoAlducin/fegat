// Controles del constructor de páginas y del header/footer (port de los de sav_3).
import { BookOpen, ChevronDown, ChevronRight, FileText, Link2, Newspaper, Plus, Search, Tag, Tags, Upload, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { ElementType, InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react';
import RichTextEditor from '@/components/rich-text-editor';
import { ICON_KEYWORDS, IconMap } from '@/lib/site-blocks';
import { cn } from '@/lib/utils';
import { uploadImage as uploadImageRoute, uploadImages as uploadImagesRoute } from '@/routes/admin/pages';
import type { LinkType, NavOptionItem, NavOptions, SiteLink } from '@/types/site';

export type UploadedImage = { url: string; width?: number | null; height?: number | null };

function csrfToken(): string {
    const match = document.cookie.match(/(?:^|; )XSRF-TOKEN=([^;]+)/);

    return match ? decodeURIComponent(match[1]) : '';
}

async function upload(url: string, body: FormData) {
    const response = await fetch(url, { method: 'POST', body, headers: { Accept: 'application/json', 'X-XSRF-TOKEN': csrfToken() } });
    const data = await response.json().catch(() => null);

    if (!response.ok) {
        const first = data?.errors ? Object.values(data.errors as Record<string, string[]>)[0]?.[0] : null;
        throw new Error(first || data?.message || 'No se pudo subir la imagen.');
    }

    return data;
}

export async function uploadImage(file: File): Promise<UploadedImage> {
    const body = new FormData();
    body.append('image', file);

    return (await upload(uploadImageRoute.url(), body)) as UploadedImage;
}

export async function uploadImages(files: File[]): Promise<string[]> {
    const body = new FormData();
    files.forEach((file) => body.append('images[]', file));

    return ((await upload(uploadImagesRoute.url(), body)) as { urls: string[] }).urls;
}

export const controlClass =
    'h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:opacity-50';

export function Field({ label, hint, children, className }: { label: string; hint?: string; children: ReactNode; className?: string }) {
    return (
        <label className={cn('block space-y-1.5', className)}>
            <span className="block text-[11px] font-semibold tracking-widest text-muted-foreground uppercase">{label}</span>
            {children}
            {hint && <span className="block text-xs text-muted-foreground">{hint}</span>}
        </label>
    );
}

export function TextInput({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
    return <input {...props} className={cn(controlClass, className)} />;
}

export function TextArea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
    return <textarea {...props} className={cn(controlClass, 'h-auto resize-y py-2', className)} />;
}

export function Select({ className, children, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
    return (
        <select {...props} className={cn(controlClass, className)}>
            {children}
        </select>
    );
}

export function Toggle({ label, description, checked, onChange }: { label: string; description?: string; checked: boolean; onChange: (value: boolean) => void }) {
    return (
        <label className="flex cursor-pointer items-start gap-3 py-2">
            <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} className="mt-0.5 size-4 accent-brand" />
            <span>
                <span className="block text-sm font-medium">{label}</span>
                {description && <span className="block text-xs text-muted-foreground">{description}</span>}
            </span>
        </label>
    );
}

export function ColorField({ label, value, fallback, onChange, hint }: { label: string; value: string; fallback: string; onChange: (value: string) => void; hint?: string }) {
    return (
        <Field label={label} hint={hint}>
            <div className="flex gap-2">
                <input
                    type="color"
                    value={/^#[0-9a-f]{6}$/i.test(value) ? value : fallback}
                    onChange={(event) => onChange(event.target.value)}
                    className="h-9 w-12 shrink-0 cursor-pointer rounded-md border border-input bg-transparent p-1"
                />
                <TextInput value={value} onChange={(event) => onChange(event.target.value)} placeholder={fallback} />
            </div>
        </Field>
    );
}

export function RichTextField({ label, value, onChange, full = false }: { label: string; value: string; onChange: (value: string) => void; full?: boolean }) {
    return (
        <div className="space-y-1.5">
            <p className="text-[11px] font-semibold tracking-widest text-muted-foreground uppercase">{label}</p>
            <RichTextEditor defaultValue={value ?? ''} onChange={onChange} compact={!full} uploadUrl={full ? uploadImageRoute.url() : undefined} />
        </div>
    );
}

export function AddButton({ label, onClick }: { label: string; onClick: () => void }) {
    return (
        <button
            type="button"
            onClick={onClick}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-dashed py-3 text-sm font-semibold text-muted-foreground transition hover:border-brand hover:text-brand"
        >
            <Plus className="size-4" /> {label}
        </button>
    );
}

export function ImageField({
    label,
    value,
    onChange,
    onUploaded,
    aspect = 'video',
}: {
    label: string;
    value: string;
    onChange: (value: string) => void;
    onUploaded?: (image: UploadedImage) => void;
    aspect?: 'video' | 'portrait' | 'logo';
}) {
    const fileRef = useRef<HTMLInputElement>(null);
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const aspectClass = aspect === 'portrait' ? 'aspect-[4/5]' : aspect === 'logo' ? 'aspect-[3/1]' : 'aspect-video';

    async function handleFile(file?: File) {
        if (!file) {
            return;
        }

        setUploading(true);
        setError(null);

        try {
            const uploaded = await uploadImage(file);
            onChange(uploaded.url);
            onUploaded?.(uploaded);
        } catch (exception) {
            setError(exception instanceof Error ? exception.message : 'No se pudo subir la imagen.');
        } finally {
            setUploading(false);

            if (fileRef.current) {
                fileRef.current.value = '';
            }
        }
    }

    return (
        <div className="space-y-2">
            <span className="block text-[11px] font-semibold tracking-widest text-muted-foreground uppercase">{label}</span>
            <div className="overflow-hidden rounded-xl border bg-muted/40">
                {value ? (
                    <div className={cn('relative', aspectClass)}>
                        <img src={value} alt="" className={cn('h-full w-full', aspect === 'logo' ? 'object-contain p-2' : 'object-cover')} />
                        <button
                            type="button"
                            onClick={() => onChange('')}
                            aria-label="Quitar imagen"
                            className="absolute top-2 right-2 rounded-full bg-black/60 p-1.5 text-white"
                        >
                            <X className="size-3.5" />
                        </button>
                    </div>
                ) : (
                    <button
                        type="button"
                        onClick={() => fileRef.current?.click()}
                        className={cn('flex w-full flex-col items-center justify-center gap-2 text-xs text-muted-foreground', aspectClass)}
                    >
                        <Upload className="size-5" />
                        {uploading ? 'Subiendo…' : 'Subir imagen'}
                    </button>
                )}
            </div>
            <div className="flex gap-2">
                <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    disabled={uploading}
                    className="shrink-0 rounded-md bg-muted px-3 text-xs font-semibold hover:bg-muted/70"
                >
                    {uploading ? 'Subiendo…' : 'Subir'}
                </button>
                <TextInput value={value} onChange={(event) => onChange(event.target.value)} placeholder="https://… o /storage/…" className="h-8 text-xs" />
                <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp,image/gif" className="hidden" onChange={(event) => void handleFile(event.target.files?.[0])} />
            </div>
            {error && <p className="text-xs font-semibold text-red-600">{error}</p>}
        </div>
    );
}

export function BulkImageUpload({ onAdd }: { onAdd: (urls: string[]) => void }) {
    const fileRef = useRef<HTMLInputElement>(null);
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    async function handleFiles(list: FileList | null) {
        const files = list ? Array.from(list) : [];

        if (files.length === 0) {
            return;
        }

        setUploading(true);
        setError(null);

        try {
            onAdd(await uploadImages(files));
        } catch (exception) {
            setError(exception instanceof Error ? exception.message : 'No se pudieron subir las imágenes.');
        } finally {
            setUploading(false);

            if (fileRef.current) {
                fileRef.current.value = '';
            }
        }
    }

    return (
        <div>
            <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp,image/gif" multiple className="hidden" onChange={(event) => void handleFiles(event.target.files)} />
            <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-dashed py-3 text-sm font-semibold text-muted-foreground hover:border-brand hover:text-brand disabled:opacity-60"
            >
                <Upload className="size-4" /> {uploading ? 'Subiendo…' : 'Subir varias imágenes'}
            </button>
            {error && <p className="mt-1 text-xs font-semibold text-red-600">{error}</p>}
        </div>
    );
}

const normalize = (text: string) =>
    text
        .toLowerCase()
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '');

const ICON_NAMES = Object.keys(IconMap).sort();

export function IconPicker({
    label,
    value,
    onChange,
    fallback = 'Shield',
    allowEmpty = false,
}: {
    label: string;
    value?: string;
    onChange: (icon: string) => void;
    fallback?: string;
    allowEmpty?: boolean;
}) {
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState('');
    const rootRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!open) {
            return;
        }

        const onDown = (event: MouseEvent) => {
            if (!rootRef.current?.contains(event.target as Node)) {
                setOpen(false);
            }
        };
        const onKey = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                setOpen(false);
            }
        };
        document.addEventListener('mousedown', onDown);
        document.addEventListener('keydown', onKey);

        return () => {
            document.removeEventListener('mousedown', onDown);
            document.removeEventListener('keydown', onKey);
        };
    }, [open]);

    const results = useMemo(() => {
        const q = normalize(query.trim());

        return q ? ICON_NAMES.filter((name) => normalize(`${name} ${ICON_KEYWORDS[name] ?? ''}`).includes(q)) : ICON_NAMES;
    }, [query]);

    const current = value && IconMap[value] ? value : allowEmpty ? '' : fallback;
    const CurrentIcon = current ? IconMap[current] : null;
    const select = (name: string) => {
        onChange(name);
        setOpen(false);
        setQuery('');
    };

    return (
        // No usa <Field> (un <label>): un clic en el panel reenviaría el clic al botón y lo cerraría.
        <div ref={rootRef} className="relative space-y-1.5">
            <span className="block text-[11px] font-semibold tracking-widest text-muted-foreground uppercase">{label}</span>
            <button type="button" onClick={() => setOpen((previous) => !previous)} aria-haspopup="listbox" aria-expanded={open} className={cn(controlClass, 'flex items-center gap-2')}>
                {CurrentIcon && <CurrentIcon className="size-4 shrink-0 text-brand" />}
                <span className={cn('min-w-0 flex-1 truncate text-left', !current && 'text-muted-foreground')}>{current || 'Sin icono'}</span>
                <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
            </button>
            {open && (
                <div className="absolute top-full left-0 z-50 mt-1 w-72 max-w-[calc(100vw-2rem)] rounded-xl border bg-popover p-2 text-popover-foreground shadow-xl">
                    <div className="relative">
                        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                        <input
                            autoFocus
                            value={query}
                            onChange={(event) => setQuery(event.target.value)}
                            onKeyDown={(event) => {
                                if (event.key === 'Enter') {
                                    event.preventDefault();

                                    if (results[0]) {
                                        select(results[0]);
                                    }
                                }
                            }}
                            placeholder="Buscar icono…"
                            className={cn(controlClass, 'pl-9')}
                        />
                    </div>
                    {results.length === 0 ? (
                        <p className="px-2 py-6 text-center text-xs text-muted-foreground">Sin resultados</p>
                    ) : (
                        <div role="listbox" className="mt-2 grid max-h-56 grid-cols-6 gap-1 overflow-y-auto">
                            {results.map((name) => {
                                const Icon = IconMap[name];

                                return (
                                    <button
                                        key={name}
                                        type="button"
                                        role="option"
                                        aria-selected={name === current}
                                        title={name}
                                        onClick={() => select(name)}
                                        className={cn('flex aspect-square items-center justify-center rounded-lg transition', name === current ? 'bg-brand text-white' : 'hover:bg-muted')}
                                    >
                                        <Icon className="size-5" />
                                    </button>
                                );
                            })}
                        </div>
                    )}
                    {allowEmpty && current && (
                        <button type="button" onClick={() => select('')} className="mt-2 w-full rounded-lg py-1.5 text-xs font-semibold text-red-500 hover:bg-red-50">
                            Quitar icono
                        </button>
                    )}
                </div>
            )}
        </div>
    );
}

const LINK_TYPES: Record<LinkType, { label: string; icon: ElementType; color: string }> = {
    page: { label: 'Página', icon: FileText, color: '#059669' },
    blog: { label: 'Blog', icon: Newspaper, color: '#0369a1' },
    blog_post: { label: 'Artículo del blog', icon: BookOpen, color: '#0f766e' },
    blog_category: { label: 'Categoría del blog', icon: Tag, color: '#9333ea' },
    blog_tag: { label: 'Etiqueta del blog', icon: Tags, color: '#c2410c' },
    custom: { label: 'URL personalizada', icon: Link2, color: '#d97706' },
};

type ReferencedType = 'page' | 'blog_post' | 'blog_category' | 'blog_tag';

const isReferenced = (type: LinkType): type is ReferencedType => type !== 'blog' && type !== 'custom';

function LinkTypeBadge({ type }: { type: LinkType }) {
    const meta = LINK_TYPES[type];
    const Icon = meta.icon;

    return (
        <span className="flex shrink-0 items-center gap-1 rounded-md px-1.5 py-0.5 text-xs font-semibold" style={{ background: `${meta.color}15`, color: meta.color }}>
            <Icon className="size-2.5" /> {meta.label}
        </span>
    );
}

/**
 * Destino de un enlace: una página o artículo (se guarda su id y la URL se recalcula al
 * mostrarse), el blog o una URL escrita a mano.
 */
export function LinkSelector({ value, onChange, navOptions }: { value: SiteLink; onChange: (value: SiteLink) => void; navOptions: NavOptions }) {
    const [open, setOpen] = useState(false);
    const [pending, setPending] = useState<ReferencedType | null>(null);
    const rootRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!open) {
            return;
        }

        const onDown = (event: MouseEvent) => {
            if (!rootRef.current?.contains(event.target as Node)) {
                setOpen(false);
                setPending(null);
            }
        };
        document.addEventListener('mousedown', onDown);

        return () => document.removeEventListener('mousedown', onDown);
    }, [open]);

    const close = () => {
        setOpen(false);
        setPending(null);
    };

    const selectType = (type: LinkType) => {
        if (type === 'blog') {
            onChange({ ...value, label: navOptions.blog.label, url: navOptions.blog.url, link_type: 'blog', ref_id: null });
            close();
        } else if (type === 'custom') {
            onChange({ ...value, link_type: 'custom', ref_id: null });
            close();
        } else if (isReferenced(type)) {
            setPending(type);
        }
    };

    const selectItem = (item: NavOptionItem) => {
        onChange({ ...value, label: item.label, url: item.url, link_type: pending!, ref_id: item.id });
        close();
    };

    const groups: Record<ReferencedType, { items: NavOptionItem[]; label: string; empty: string }> = {
        page: { items: navOptions.pages, label: 'Páginas', empty: 'Sin páginas' },
        blog_post: { items: navOptions.blog_posts, label: 'Artículos del blog', empty: 'Sin artículos publicados' },
        blog_category: { items: navOptions.blog_categories, label: 'Categorías del blog', empty: 'Sin categorías activas' },
        blog_tag: { items: navOptions.blog_tags, label: 'Etiquetas del blog', empty: 'Sin etiquetas activas' },
    };
    const group = pending ? groups[pending] : null;
    const selected = value.link_type && isReferenced(value.link_type) ? groups[value.link_type].items.find((item) => item.id === value.ref_id) : null;

    return (
        <div ref={rootRef} className="relative min-w-0 flex-1">
            <button
                type="button"
                onClick={() => {
                    setOpen((previous) => !previous);
                    setPending(null);
                }}
                className={cn(controlClass, 'flex items-center justify-between gap-2 text-left text-xs')}
            >
                <span className="flex min-w-0 items-center gap-2 overflow-hidden">
                    <LinkTypeBadge type={value.link_type ?? 'custom'} />
                    <span className="truncate text-muted-foreground">
                        {value.link_type === 'custom' ? value.url || 'Escribe la URL…' : (selected?.label ?? value.url)}
                    </span>
                </span>
                <ChevronDown className="size-3.5 shrink-0 text-muted-foreground" />
            </button>

            {(value.link_type ?? 'custom') === 'custom' && (
                <TextInput
                    value={value.url}
                    onChange={(event) => onChange({ ...value, url: event.target.value })}
                    placeholder="https://… o /ruta"
                    className="mt-1.5 h-8 text-xs"
                />
            )}

            {open && (
                <div className="absolute top-full left-0 z-50 mt-1 max-h-80 w-full min-w-64 overflow-y-auto rounded-xl border bg-popover p-1 text-popover-foreground shadow-lg">
                    {!group &&
                        (Object.entries(LINK_TYPES) as [LinkType, (typeof LINK_TYPES)[LinkType]][]).map(([type, meta]) => {
                            const Icon = meta.icon;

                            return (
                                <button
                                    key={type}
                                    type="button"
                                    onClick={() => selectType(type)}
                                    className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-xs font-medium hover:bg-muted"
                                >
                                    <span className="flex size-6 shrink-0 items-center justify-center rounded-md" style={{ background: `${meta.color}15` }}>
                                        <Icon className="size-3.5" style={{ color: meta.color }} />
                                    </span>
                                    <span className="flex-1">{meta.label}</span>
                                    {isReferenced(type) && <ChevronRight className="size-3 text-muted-foreground" />}
                                </button>
                            );
                        })}
                    {group && (
                        <>
                            <button
                                type="button"
                                onClick={() => setPending(null)}
                                className="flex w-full items-center gap-1.5 px-2 py-1.5 text-xs font-semibold tracking-widest text-muted-foreground uppercase"
                            >
                                <ChevronRight className="size-3 rotate-180" /> {group.label}
                            </button>
                            {group.items.length === 0 && <p className="px-3 py-4 text-center text-xs text-muted-foreground">{group.empty}</p>}
                            {group.items.map((item) => (
                                <button
                                    key={item.id}
                                    type="button"
                                    onClick={() => selectItem(item)}
                                    className="flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-left hover:bg-muted"
                                >
                                    <span className="truncate text-xs">{item.label}</span>
                                    <span className="shrink-0 font-mono text-xs text-muted-foreground">{item.url}</span>
                                </button>
                            ))}
                        </>
                    )}
                </div>
            )}
        </div>
    );
}
