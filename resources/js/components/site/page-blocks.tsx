// Renderizador de las páginas por bloques (port de CustomPage/HomeBlocks de sav_3).
import { Deferred, Form, Link, usePoll } from '@inertiajs/react';
import { ArrowRight, ChevronDown, ChevronLeft, ChevronRight, Clock, ImageOff, Mail, MapPin, Phone, Quote, Shield, X } from 'lucide-react';
import { createContext, useContext, useEffect, useRef, useState } from 'react';
import type { CSSProperties, ElementType, ReactNode } from 'react';
import CompanyLogos from '@/components/public/company-logos';
import type { Company } from '@/components/public/company-logos';
import PostCard from '@/components/public/post-card';
import type { PostSummary } from '@/components/public/post-card';
import SemaphoreCard from '@/components/semaphore-card';
import WeatherCard, { WeatherCardSkeleton } from '@/components/weather-card';
import { CustomHtml, IconMap, RichHtml, filledItems, gridColumnsClass, hasHtml, overlayStyle, stripHtml } from '@/lib/site-blocks';
import { cn } from '@/lib/utils';
import { store as sendContact } from '@/routes/contact';
import type { SemaphoreData, WeatherData } from '@/types';
import type { ContactDetails, PageBlock, PageTheme } from '@/types/site';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Settings = Record<string, any>;

type Variant = 1 | 2 | 3 | 4 | 5 | 6;

/** Datos que el servidor carga solo si la página tiene el bloque que los usa. */
export type PageData = {
    semaphore: SemaphoreData | null;
    weather?: WeatherData | null;
    companies: Company[];
    posts: PostSummary[];
    contact: ContactDetails | null;
};

const PageDataContext = createContext<PageData>({ semaphore: null, companies: [], posts: [], contact: null });

export function themeVars(theme?: Partial<PageTheme>): CSSProperties {
    return {
        '--cp-primary': theme?.primary || '#6c0ea3',
        '--cp-secondary': theme?.secondary || '#c699e1',
        '--cp-accent': theme?.accent || '#ead7f6',
        '--cp-bg': theme?.background || '#f3f5fa',
        '--cp-text': theme?.text || '#444444',
        '--cp-radius': `${theme?.radius ?? 12}px`,
        '--cp-shadow': theme?.shadow === false ? 'none' : '0 24px 70px rgba(44, 13, 56, .14)',
    } as CSSProperties;
}

export function variantStyles(variant: Variant) {
    const dark = variant === 1;
    const warm = variant === 2 || variant === 4;
    const airy = variant === 3 || variant === 5;
    const classic = variant === 6;

    return {
        page: dark ? 'bg-[#111018] text-white' : airy ? 'bg-white text-[var(--cp-text)]' : 'bg-white text-[var(--cp-text)]',
        hero: classic ? 'bg-[var(--cp-primary)]' : warm ? 'bg-[#2a1a0f]' : dark ? 'bg-[#111018]' : 'bg-[#24112d]',
        bandSoft: dark ? 'bg-[#181522] text-white' : 'bg-[var(--cp-bg)] text-[var(--cp-text)]',
        bandLight: dark ? 'bg-[#111018] text-white' : 'bg-white text-[var(--cp-text)]',
        bandDark: classic || dark ? 'bg-[var(--cp-primary)] text-white' : 'bg-[#23112d] text-white',
        heading: variant === 5 ? 'font-black tracking-tight' : 'font-bold tracking-tight',
    };
}

function heroOverlayDefault(variant: Variant): string {
    if (variant === 1) {
        return '#0b0a12';
    }

    if (variant === 2 || variant === 4) {
        return '#1a120c';
    }

    return variant === 6 ? '#2c0d38' : '#24112d';
}

function bgClass(bg?: string): string | null {
    switch (bg) {
        case 'white':
            return 'bg-white text-[var(--cp-text)]';
        case 'soft':
            return 'bg-[var(--cp-bg)] text-[var(--cp-text)]';
        case 'primary':
            return 'bg-[var(--cp-primary)] text-white';
        case 'secondary':
            return 'bg-[var(--cp-secondary)] text-white';
        case 'accent':
            return 'bg-[var(--cp-accent)] text-[var(--cp-text)]';
        case 'custom':
            return 'text-[var(--cp-text)]';
        case 'transparent':
            return 'bg-transparent';
        default:
            return null;
    }
}

function container(settings: Settings, base: string): string {
    return settings.section_width === 'full' ? 'max-w-none' : base;
}

const radius = { borderRadius: 'var(--cp-radius)' } satisfies CSSProperties;

/** Enlace de un botón: las rutas del sitio navegan con Inertia; anclas y externos con <a>. */
function SmartLink({ href, className, children, newTab }: { href: string; className?: string; children: ReactNode; newTab?: boolean }) {
    if (href.startsWith('/') && !href.includes('#') && !newTab) {
        return (
            <Link href={href} className={className}>
                {children}
            </Link>
        );
    }

    return (
        <a href={href} className={className} target={newTab ? '_blank' : undefined} rel={newTab ? 'noopener noreferrer' : undefined}>
            {children}
        </a>
    );
}

function ButtonLink({ href, children, variant = 'primary' }: { href?: string; children?: ReactNode; variant?: 'primary' | 'secondary' }) {
    if (!href || !children) {
        return null;
    }

    return (
        <SmartLink
            href={href}
            className={
                variant === 'primary'
                    ? 'inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-[var(--cp-secondary)] px-6 py-3 font-display text-sm font-bold text-white shadow-lg shadow-black/10 transition hover:scale-[1.02]'
                    : 'inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-white/70 bg-white/15 px-6 py-3 font-display text-sm font-bold text-white backdrop-blur transition hover:bg-white/25'
            }
        >
            {children}
            {variant === 'primary' && <ArrowRight className="size-4" />}
        </SmartLink>
    );
}

function Section({
    id,
    children,
    tone = 'light',
    variant,
    settings,
}: {
    id: string;
    children: ReactNode;
    tone?: 'light' | 'soft' | 'dark';
    variant: Variant;
    settings?: Settings;
}) {
    const s = variantStyles(variant);
    const toneClass = tone === 'dark' ? s.bandDark : tone === 'soft' ? s.bandSoft : s.bandLight;

    return (
        <section
            id={id}
            className={cn('scroll-mt-28 px-4 py-16 sm:px-6 lg:px-8', bgClass(settings?.bg) ?? toneClass)}
            style={settings?.bg === 'custom' && settings.bg_color ? { backgroundColor: settings.bg_color } : undefined}
        >
            {children}
            <CustomHtml html={settings?.custom_html} />
        </section>
    );
}

function Heading({
    settings,
    center = true,
    variant,
}: {
    settings: Settings;
    center?: boolean;
    variant: Variant;
}) {
    if (!settings.eyebrow && !hasHtml(settings.title) && !hasHtml(settings.description)) {
        return null;
    }

    return (
        <div className={cn('mx-auto mb-10 max-w-3xl', center && 'text-center')}>
            {settings.eyebrow && (
                <p className="mb-3 text-xs font-black tracking-[.28em] text-[var(--cp-secondary)] uppercase">{settings.eyebrow}</p>
            )}
            <RichHtml
                html={settings.title}
                className={cn('custom-rich-title font-display text-3xl text-[var(--cp-primary)] uppercase sm:text-4xl', variantStyles(variant).heading)}
            />
            {center && hasHtml(settings.title) && (
                <div className="relative mx-auto mt-5 h-px w-32 bg-current/20">
                    <span className="absolute -top-px left-1/2 h-[3px] w-10 -translate-x-1/2 bg-[var(--cp-secondary)]" />
                </div>
            )}
            <RichHtml html={settings.description} className="custom-rich-copy mt-5 text-base leading-7 opacity-80" />
        </div>
    );
}

// ── Bloques ─────────────────────────────────────────────────────────────────

function HeroBlock({ block, variant, priority }: { block: PageBlock; variant: Variant; priority: boolean }) {
    const settings = block.settings;
    const alignLeft = settings.align === 'left';
    const side = settings.image_layout === 'side' && settings.image;
    const overlay = overlayStyle(settings, heroOverlayDefault(variant));
    const alt = settings.image_alt || stripHtml(settings.title);

    const text = (
        <div className={cn('flex flex-col', alignLeft || side ? 'items-start text-left' : 'items-center text-center')}>
            {settings.badge && (
                <span className="mb-5 inline-flex rounded-full border border-white/30 bg-white/15 px-4 py-2 text-xs font-black tracking-[.25em] uppercase backdrop-blur">
                    {settings.badge}
                </span>
            )}
            <RichHtml
                html={settings.title}
                className="custom-rich-title max-w-5xl font-display text-4xl leading-[1.15] font-bold text-balance uppercase sm:text-5xl lg:text-6xl"
            />
            <RichHtml
                html={settings.subtitle}
                className={cn('custom-rich-copy mt-6 max-w-3xl text-lg leading-8 text-white/85', !alignLeft && !side && 'mx-auto')}
            />
            <div className={cn('mt-9 flex flex-wrap gap-3', !alignLeft && !side && 'justify-center')}>
                <ButtonLink href={settings.primary_url}>{settings.primary_label}</ButtonLink>
                <ButtonLink href={settings.secondary_url} variant="secondary">
                    {settings.secondary_label}
                </ButtonLink>
            </div>
        </div>
    );

    if (side) {
        return (
            <section id={block.id} className={cn('overflow-hidden px-4 py-16 text-white sm:px-6 lg:px-8', variantStyles(variant).hero)}>
                <div className="mx-auto grid max-w-6xl items-center gap-10 md:min-h-[440px] md:grid-cols-2">
                    {text}
                    <img
                        src={settings.image}
                        alt={alt}
                        loading={priority ? 'eager' : 'lazy'}
                        fetchPriority={priority ? 'high' : 'auto'}
                        className="mx-auto max-h-[400px] w-auto animate-float"
                    />
                </div>
            </section>
        );
    }

    return (
        <section
            id={block.id}
            className={cn('relative isolate overflow-hidden px-4 py-20 text-white sm:px-6 lg:px-8', variantStyles(variant).hero)}
        >
            {settings.image && (
                <picture className="contents">
                    {settings.image_mobile && <source media="(max-width: 768px)" srcSet={settings.image_mobile} />}
                    <img
                        src={settings.image}
                        alt={alt}
                        width={settings.image_width || undefined}
                        height={settings.image_height || undefined}
                        loading={priority ? 'eager' : 'lazy'}
                        fetchPriority={priority ? 'high' : 'auto'}
                        className="absolute inset-0 -z-20 h-full w-full object-cover"
                        style={settings.image_position ? { objectPosition: settings.image_position } : undefined}
                    />
                </picture>
            )}
            {overlay && <div className="absolute inset-0 -z-10" style={overlay} />}
            <div className={cn('mx-auto flex max-w-6xl flex-col justify-center', settings.image ? 'min-h-[440px]' : 'min-h-[220px]')}>{text}</div>
        </section>
    );
}

function RichTextBlock({ block, variant }: { block: PageBlock; variant: Variant }) {
    const settings = block.settings;

    return (
        <Section id={block.id} tone="light" variant={variant} settings={settings}>
            <div className={cn('mx-auto', container(settings, settings.width === 'wide' ? 'max-w-5xl' : 'max-w-3xl'))}>
                <Heading settings={{ eyebrow: settings.eyebrow, title: settings.title }} variant={variant} />
                {hasHtml(settings.body) && (
                    <div className="custom-page-rich text-lg leading-8 opacity-90" dangerouslySetInnerHTML={{ __html: settings.body }} />
                )}
            </div>
        </Section>
    );
}

function ImageBlock({ block, variant }: { block: PageBlock; variant: Variant }) {
    const settings = block.settings;
    const split = settings.layout === 'split';
    const overlay = overlayStyle(settings, '#160C19', 45);

    return (
        <Section id={block.id} tone="soft" variant={variant} settings={settings}>
            <div className={cn('mx-auto grid gap-10', container(settings, 'max-w-6xl'), split && 'items-center lg:grid-cols-2')}>
                <div className={cn(split && 'lg:order-2')}>
                    <Heading settings={settings} center={!split} variant={variant} />
                </div>
                <div className="relative overflow-hidden bg-white shadow-[var(--cp-shadow)]" style={radius}>
                    {settings.image ? (
                        <>
                            <img
                                src={settings.image}
                                alt={settings.alt || stripHtml(settings.title)}
                                loading="lazy"
                                className="aspect-video w-full object-cover"
                            />
                            {overlay && <div className="pointer-events-none absolute inset-0" style={overlay} />}
                        </>
                    ) : (
                        <div className="flex aspect-video items-center justify-center text-zinc-300">
                            <ImageOff className="size-10" />
                        </div>
                    )}
                </div>
            </div>
        </Section>
    );
}

type CardItem = { icon?: string; image?: string; alt?: string; title?: string; desc?: string };

function ImageCardsBlock({ block, variant }: { block: PageBlock; variant: Variant }) {
    const settings = block.settings;
    const items = filledItems<CardItem>(settings.items, ['image', 'title', 'desc']);
    const textTop = settings.text_position !== 'bottom';

    if (items.length === 0) {
        return null;
    }

    return (
        <Section id={block.id} tone="light" variant={variant} settings={settings}>
            <div className={cn('mx-auto', container(settings, 'max-w-6xl'))}>
                <Heading settings={settings} variant={variant} />
                <div className={cn('grid gap-5', gridColumnsClass(settings.columns))}>
                    {items.map((item, index) => {
                        const Icon = item.icon ? IconMap[item.icon] : null;
                        const text = (Icon || item.title || item.desc) && (
                            <div className="flex-1 p-5">
                                {Icon && (
                                    <span className="mb-4 flex size-11 items-center justify-center rounded-full bg-[var(--cp-primary)]/10 text-[var(--cp-primary)]">
                                        <Icon className="size-5" />
                                    </span>
                                )}
                                {item.title && <h3 className="font-display text-lg font-bold">{item.title}</h3>}
                                {item.desc && <p className="mt-2 text-sm leading-6 whitespace-pre-line opacity-75">{item.desc}</p>}
                            </div>
                        );
                        const image = item.image && (
                            <img src={item.image} alt={item.alt || item.title || ''} loading="lazy" className="aspect-[4/3] w-full object-cover" />
                        );

                        return (
                            <article
                                key={index}
                                className="flex flex-col overflow-hidden bg-white text-[var(--cp-text)] shadow-[var(--cp-shadow)] transition hover:-translate-y-1"
                                style={radius}
                            >
                                {textTop ? text : image}
                                {textTop ? image : text}
                            </article>
                        );
                    })}
                </div>
            </div>
        </Section>
    );
}

type Feature = { icon?: string; title?: string; desc?: string };

function FeatureCard({ item, className }: { item: Feature; className?: string }) {
    const Icon = IconMap[item.icon ?? ''] ?? Shield;

    return (
        <div className={cn('flex items-start gap-3 bg-white p-4 text-[var(--cp-text)] ring-1 ring-black/5', className)} style={radius}>
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[var(--cp-primary)]/10 text-[var(--cp-primary)]">
                <Icon className="size-5" />
            </span>
            <div className="min-w-0">
                {item.title && <h3 className="text-sm font-black">{item.title}</h3>}
                {item.desc && <p className="mt-1 text-xs leading-5 whitespace-pre-line opacity-75">{item.desc}</p>}
            </div>
        </div>
    );
}

function ImageFeaturesBlock({ block, variant }: { block: PageBlock; variant: Variant }) {
    const settings = block.settings;
    const items = filledItems<Feature>(settings.items, ['title', 'desc']);
    const imageRight = settings.image_side === 'right';
    const floating: Feature = { icon: settings.card_icon, title: settings.card_title, desc: settings.card_desc };

    if (!settings.image && !hasHtml(settings.title) && items.length === 0 && !settings.custom_html) {
        return null;
    }

    return (
        <Section id={block.id} tone="soft" variant={variant} settings={settings}>
            <div className={cn('mx-auto grid items-center gap-10 lg:gap-14', container(settings, 'max-w-6xl'), settings.image && 'lg:grid-cols-2')}>
                {settings.image && (
                    <figure className={cn('relative', imageRight && 'lg:order-2')}>
                        <div className="overflow-hidden bg-white p-1.5 shadow-[var(--cp-shadow)]" style={radius}>
                            <img
                                src={settings.image}
                                alt={settings.alt || ''}
                                loading="lazy"
                                className="aspect-[4/3] w-full object-cover lg:aspect-square"
                                style={radius}
                            />
                        </div>
                        {(floating.title || floating.desc) && (
                            <FeatureCard item={floating} className="absolute right-4 bottom-4 left-4 shadow-xl sm:left-auto sm:max-w-[18rem]" />
                        )}
                    </figure>
                )}
                <div>
                    <Heading settings={settings} center={false} variant={variant} />
                    {items.length > 0 && (
                        <div className="grid gap-4 sm:grid-cols-2">
                            {items.map((item, index) => (
                                <FeatureCard key={index} item={item} />
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </Section>
    );
}

type GalleryImage = { image: string; caption?: string };

function useLightbox(count: number) {
    const [open, setOpen] = useState(false);
    const [index, setIndex] = useState(0);
    const prev = () => setIndex((current) => (current - 1 + count) % count);
    const next = () => setIndex((current) => (current + 1) % count);

    useEffect(() => {
        if (!open) {
            return;
        }

        const onKey = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                setOpen(false);
            }

            if (event.key === 'ArrowLeft') {
                setIndex((current) => (current - 1 + count) % count);
            }

            if (event.key === 'ArrowRight') {
                setIndex((current) => (current + 1) % count);
            }
        };
        const previousOverflow = document.body.style.overflow;
        window.addEventListener('keydown', onKey);
        document.body.style.overflow = 'hidden';

        return () => {
            window.removeEventListener('keydown', onKey);
            document.body.style.overflow = previousOverflow;
        };
    }, [open, count]);

    return {
        open,
        index,
        setIndex,
        prev,
        next,
        openAt: (i: number) => {
            setIndex(i);
            setOpen(true);
        },
        close: () => setOpen(false),
    };
}

function GalleryThumb({ item, overlay, onClick, className }: { item: GalleryImage; overlay: CSSProperties | null; onClick: () => void; className?: string }) {
    return (
        <button
            type="button"
            onClick={onClick}
            style={radius}
            className={cn('group relative block w-full cursor-zoom-in overflow-hidden bg-white shadow-[var(--cp-shadow)]', className)}
        >
            <img
                src={item.image}
                alt={item.caption || ''}
                loading="lazy"
                className="absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:scale-105"
            />
            {overlay && <span className="pointer-events-none absolute inset-0" style={overlay} />}
            {item.caption && (
                <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/55 to-transparent px-3 py-2 text-left text-xs font-semibold text-white">
                    {item.caption}
                </span>
            )}
        </button>
    );
}

function GalleryCarousel({ images, overlay, onOpen }: { images: GalleryImage[]; overlay: CSSProperties | null; onOpen: (i: number) => void }) {
    const scroller = useRef<HTMLDivElement>(null);
    const scrollBy = (direction: number) => {
        const element = scroller.current;
        element?.scrollBy({ left: direction * element.clientWidth * 0.85, behavior: 'smooth' });
    };

    return (
        <div className="relative">
            <div ref={scroller} className="flex snap-x snap-mandatory [scrollbar-width:none] gap-4 overflow-x-auto pb-2 [&::-webkit-scrollbar]:hidden">
                {images.map((item, index) => (
                    <div key={`${item.image}-${index}`} className="w-[85%] shrink-0 snap-center sm:w-[55%] lg:w-[42%]">
                        <GalleryThumb item={item} overlay={overlay} onClick={() => onOpen(index)} className="aspect-[16/10]" />
                    </div>
                ))}
            </div>
            {images.length > 1 &&
                ([-1, 1] as const).map((direction) => (
                    <button
                        key={direction}
                        type="button"
                        onClick={() => scrollBy(direction)}
                        aria-label={direction < 0 ? 'Anterior' : 'Siguiente'}
                        className={cn(
                            'absolute top-1/2 z-10 hidden -translate-y-1/2 rounded-full bg-white/90 p-2 text-neutral-800 shadow-lg backdrop-blur transition hover:bg-white sm:block',
                            direction < 0 ? 'left-2' : 'right-2',
                        )}
                    >
                        {direction < 0 ? <ChevronLeft className="size-5" /> : <ChevronRight className="size-5" />}
                    </button>
                ))}
        </div>
    );
}

function GalleryLightbox({ images, state }: { images: GalleryImage[]; state: ReturnType<typeof useLightbox> }) {
    const current = images[state.index];

    if (!state.open || !current) {
        return null;
    }

    return (
        <div className="fixed inset-0 z-[9999] flex flex-col bg-black/90 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label="Galería">
            <div className="flex items-center justify-between px-5 py-4 text-sm font-semibold text-white/80">
                <span>
                    {state.index + 1} de {images.length}
                </span>
                <button
                    type="button"
                    onClick={state.close}
                    aria-label="Cerrar galería"
                    className="rounded-full bg-white/10 p-2 text-white transition hover:bg-white/20"
                >
                    <X className="size-5" />
                </button>
            </div>
            <div className="relative flex flex-1 items-center justify-center px-4">
                {images.length > 1 && (
                    <button
                        type="button"
                        onClick={state.prev}
                        aria-label="Imagen anterior"
                        className="absolute left-3 rounded-full bg-white/10 p-2.5 text-white hover:bg-white/20"
                    >
                        <ChevronLeft className="size-6" />
                    </button>
                )}
                <img src={current.image} alt={current.caption || ''} className="max-h-[72vh] max-w-full rounded-lg object-contain" />
                {images.length > 1 && (
                    <button
                        type="button"
                        onClick={state.next}
                        aria-label="Imagen siguiente"
                        className="absolute right-3 rounded-full bg-white/10 p-2.5 text-white hover:bg-white/20"
                    >
                        <ChevronRight className="size-6" />
                    </button>
                )}
            </div>
            {current.caption && <p className="px-6 pb-2 text-center text-sm text-white/70">{current.caption}</p>}
            {images.length > 1 && (
                <div className="flex [scrollbar-width:none] gap-2 overflow-x-auto px-5 py-4 [&::-webkit-scrollbar]:hidden">
                    {images.map((item, i) => (
                        <button
                            key={`${item.image}-${i}`}
                            type="button"
                            onClick={() => state.setIndex(i)}
                            aria-label={`Ver imagen ${i + 1}`}
                            className={cn(
                                'h-14 w-20 shrink-0 overflow-hidden rounded-md ring-2 transition',
                                i === state.index ? 'ring-white' : 'opacity-60 ring-transparent hover:opacity-100',
                            )}
                        >
                            <img src={item.image} alt="" className="h-full w-full object-cover" />
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}

function GalleryBlock({ block, variant }: { block: PageBlock; variant: Variant }) {
    const settings = block.settings;
    const images = filledItems<GalleryImage>(settings.images, ['image']);
    const lightbox = useLightbox(images.length);
    const overlay = overlayStyle(settings, '#160C19', 35);

    if (images.length === 0) {
        return null;
    }

    return (
        <Section id={block.id} tone="light" variant={variant} settings={settings}>
            <div className={cn('mx-auto', container(settings, 'max-w-6xl'))}>
                <Heading settings={settings} variant={variant} />
                {settings.layout === 'carousel' && <GalleryCarousel images={images} overlay={overlay} onOpen={lightbox.openAt} />}
                {settings.layout === 'pdp' && (
                    <div className="grid auto-rows-[150px] grid-cols-2 gap-3 sm:auto-rows-[210px] sm:grid-cols-4">
                        {images.slice(0, 5).map((item, index) => (
                            <GalleryThumb
                                key={`${item.image}-${index}`}
                                item={item}
                                overlay={overlay}
                                onClick={() => lightbox.openAt(index)}
                                className={cn('h-full', index === 0 && 'col-span-2 row-span-2')}
                            />
                        ))}
                    </div>
                )}
                {settings.layout !== 'carousel' && settings.layout !== 'pdp' && (
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {images.map((item, index) => (
                            <GalleryThumb
                                key={`${item.image}-${index}`}
                                item={item}
                                overlay={overlay}
                                onClick={() => lightbox.openAt(index)}
                                className="aspect-[4/3]"
                            />
                        ))}
                    </div>
                )}
            </div>
            <GalleryLightbox images={images} state={lightbox} />
        </Section>
    );
}

function StatsBlock({ block, variant }: { block: PageBlock; variant: Variant }) {
    const settings = block.settings;
    const items = filledItems<{ value?: string; label?: string }>(settings.items, ['value', 'label']);

    if (items.length === 0 && !settings.custom_html) {
        return null;
    }

    return (
        <Section id={block.id} tone="dark" variant={variant} settings={settings}>
            <div className={cn('mx-auto', container(settings, 'max-w-5xl'))}>
                <Heading settings={settings} variant={variant} />
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    {items.map((item, index) => (
                        <div key={index} className="bg-white/10 p-6 text-center ring-1 ring-white/15 backdrop-blur" style={radius}>
                            <p className="font-display text-4xl font-bold">{item.value}</p>
                            <p className="mt-2 text-sm font-semibold opacity-80">{item.label}</p>
                        </div>
                    ))}
                </div>
            </div>
        </Section>
    );
}

function WhyUsBlock({ block, variant }: { block: PageBlock; variant: Variant }) {
    const settings = block.settings;
    const items = filledItems<Feature>(settings.items, ['title', 'desc']);

    return (
        <Section id={block.id} tone="soft" variant={variant} settings={settings}>
            <div className={cn('mx-auto', container(settings, 'max-w-6xl'))}>
                <Heading settings={settings} variant={variant} />
                <div className={cn('grid gap-5', gridColumnsClass(settings.columns ?? (items.length === 4 ? 4 : 3)))}>
                    {items.map((item, index) => {
                        const Icon = IconMap[item.icon ?? ''] ?? Shield;

                        return (
                            <div
                                key={index}
                                className="bg-white p-6 text-[var(--cp-text)] shadow-[var(--cp-shadow)] ring-1 ring-black/5 transition hover:-translate-y-1"
                                style={radius}
                            >
                                <span className="mb-4 flex size-11 items-center justify-center rounded-full bg-[var(--cp-primary)]/10 text-[var(--cp-primary)]">
                                    <Icon className="size-5" />
                                </span>
                                <h3 className="font-display text-lg font-bold text-[var(--cp-primary)]">{item.title}</h3>
                                {item.desc && <p className="mt-2 text-sm leading-6 whitespace-pre-line opacity-80">{item.desc}</p>}
                            </div>
                        );
                    })}
                </div>
            </div>
        </Section>
    );
}

function ProcessBlock({ block, variant }: { block: PageBlock; variant: Variant }) {
    const settings = block.settings;
    const steps = filledItems<Feature & { n?: string }>(settings.steps, ['title', 'desc']);

    return (
        <Section id={block.id} tone="light" variant={variant} settings={settings}>
            <div className={cn('mx-auto', container(settings, 'max-w-6xl'))}>
                <Heading settings={settings} variant={variant} />
                <ol className={cn('grid gap-6', gridColumnsClass(steps.length === 4 ? 4 : 3))}>
                    {steps.map((step, index) => {
                        const Icon = IconMap[step.icon ?? ''] ?? Clock;

                        return (
                            <li key={index} className="relative bg-[var(--cp-bg)] p-6" style={radius}>
                                <span className="font-display text-5xl font-bold text-[var(--cp-primary)]/15">
                                    {step.n || String(index + 1).padStart(2, '0')}
                                </span>
                                <span className="absolute top-6 right-6 flex size-10 items-center justify-center rounded-full bg-[var(--cp-primary)] text-white">
                                    <Icon className="size-5" />
                                </span>
                                <h3 className="mt-2 font-display text-lg font-bold">{step.title}</h3>
                                {step.desc && <p className="mt-2 text-sm leading-6 whitespace-pre-line opacity-80">{step.desc}</p>}
                            </li>
                        );
                    })}
                </ol>
            </div>
        </Section>
    );
}

function TestimonialsBlock({ block, variant }: { block: PageBlock; variant: Variant }) {
    const settings = block.settings;
    const items = filledItems<{ name?: string; role?: string; text?: string; avatar?: string }>(settings.items, ['text', 'name']);

    if (items.length === 0) {
        return null;
    }

    return (
        <Section id={block.id} tone="soft" variant={variant} settings={settings}>
            <div className={cn('mx-auto', container(settings, 'max-w-6xl'))}>
                <Heading settings={settings} variant={variant} />
                <div className="grid gap-5 md:grid-cols-3">
                    {items.map((item, index) => (
                        <figure key={index} className="flex flex-col bg-white p-6 text-[var(--cp-text)] shadow-[var(--cp-shadow)]" style={radius}>
                            <Quote className="size-7 text-[var(--cp-secondary)]" />
                            <blockquote className="mt-3 flex-1 leading-7 whitespace-pre-line opacity-85">{item.text}</blockquote>
                            <figcaption className="mt-5 flex items-center gap-3">
                                {item.avatar ? (
                                    <img src={item.avatar} alt="" loading="lazy" className="size-11 rounded-full object-cover" />
                                ) : (
                                    <span className="flex size-11 items-center justify-center rounded-full bg-[var(--cp-primary)] font-bold text-white">
                                        {(item.name || '?').charAt(0)}
                                    </span>
                                )}
                                <span>
                                    <span className="block font-bold">{item.name}</span>
                                    {item.role && <span className="block text-sm opacity-70">{item.role}</span>}
                                </span>
                            </figcaption>
                        </figure>
                    ))}
                </div>
            </div>
        </Section>
    );
}

function CtaBlock({ block, variant }: { block: PageBlock; variant: Variant }) {
    const settings = block.settings;
    const overlay = overlayStyle(settings, '#160C19', 45);

    return (
        <Section id={block.id} tone="dark" variant={variant} settings={settings}>
            <div
                className={cn(
                    'mx-auto grid items-center gap-8',
                    container(settings, 'max-w-6xl'),
                    settings.image ? 'lg:grid-cols-[1.1fr_.9fr]' : 'text-center',
                )}
            >
                <div>
                    {settings.badge && <p className="mb-3 text-xs font-black tracking-[.28em] text-[var(--cp-secondary)] uppercase">{settings.badge}</p>}
                    <RichHtml html={settings.title} className="custom-rich-title font-display text-3xl font-bold uppercase sm:text-4xl" />
                    <RichHtml html={settings.description} className={cn('custom-rich-copy mt-4 max-w-2xl text-lg leading-8 text-white/80', !settings.image && 'mx-auto')} />
                    <div className={cn('mt-8 flex flex-wrap gap-3', !settings.image && 'justify-center')}>
                        <ButtonLink href={settings.primary_url}>{settings.primary_label}</ButtonLink>
                        <ButtonLink href={settings.secondary_url} variant="secondary">
                            {settings.secondary_label}
                        </ButtonLink>
                    </div>
                </div>
                {settings.image && (
                    <figure className="relative overflow-hidden shadow-2xl" style={radius}>
                        <img src={settings.image} alt="" loading="lazy" className="aspect-[4/3] w-full object-cover" />
                        {overlay && <div className="pointer-events-none absolute inset-0" style={overlay} />}
                    </figure>
                )}
            </div>
        </Section>
    );
}

function FaqBlock({ block, variant }: { block: PageBlock; variant: Variant }) {
    const settings = block.settings;
    const items = filledItems<{ question?: string; answer?: string }>(settings.items, ['question']);
    const [open, setOpen] = useState(0);

    if (items.length === 0) {
        return null;
    }

    return (
        <Section id={block.id} tone="soft" variant={variant} settings={settings}>
            <div className={cn('mx-auto', container(settings, 'max-w-4xl'))}>
                <Heading settings={settings} variant={variant} />
                <div className="space-y-3">
                    {items.map((item, index) => (
                        <div key={index} className="overflow-hidden bg-white text-[var(--cp-text)] shadow-[var(--cp-shadow)]" style={radius}>
                            <button
                                type="button"
                                onClick={() => setOpen(open === index ? -1 : index)}
                                aria-expanded={open === index}
                                className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left font-bold"
                            >
                                {item.question}
                                <ChevronDown className={cn('size-5 shrink-0 transition', open === index && 'rotate-180')} />
                            </button>
                            {open === index && <p className="px-5 pb-5 leading-7 whitespace-pre-line opacity-80">{item.answer}</p>}
                        </div>
                    ))}
                </div>
            </div>
        </Section>
    );
}

/** El semáforo se refresca cada 15 s mientras la página lo muestra. */
function SemaphorePoller() {
    usePoll(15000, { only: ['semaphore'] });

    return null;
}

function SemaphoreBlock({ block, variant }: { block: PageBlock; variant: Variant }) {
    const { semaphore } = useContext(PageDataContext);

    if (!semaphore) {
        return null;
    }

    return (
        <Section id={block.id} tone="light" variant={variant} settings={block.settings}>
            <SemaphorePoller />
            <div className={cn('mx-auto', container(block.settings, 'max-w-4xl'))}>
                <Heading settings={block.settings} variant={variant} />
                <SemaphoreCard semaphore={semaphore} tone="light" className="shadow-[0_0_30px_rgba(0,0,0,0.15)]" />
            </div>
        </Section>
    );
}

function WeatherBlock({ block, variant }: { block: PageBlock; variant: Variant }) {
    const { weather } = useContext(PageDataContext);

    return (
        <Section id={block.id} tone="light" variant={variant} settings={block.settings}>
            <div className={cn('mx-auto', container(block.settings, 'max-w-4xl'))}>
                <Heading settings={block.settings} variant={variant} />
                <Deferred data="weather" fallback={<WeatherCardSkeleton tone="light" />}>
                    <WeatherCard weather={weather ?? null} tone="light" className="shadow-[0_0_30px_rgba(0,0,0,0.15)]" />
                </Deferred>
            </div>
        </Section>
    );
}

function AssociatesBlock({ block, variant }: { block: PageBlock; variant: Variant }) {
    const { companies } = useContext(PageDataContext);

    if (companies.length === 0) {
        return null;
    }

    return (
        <Section id={block.id} tone="soft" variant={variant} settings={block.settings}>
            <div className={cn('mx-auto', container(block.settings, 'max-w-6xl'))}>
                <Heading settings={block.settings} variant={variant} />
                <CompanyLogos companies={companies} />
            </div>
        </Section>
    );
}

function PostsBlock({ block, variant }: { block: PageBlock; variant: Variant }) {
    const { posts } = useContext(PageDataContext);
    const limit = Number(block.settings.limit) || 3;

    if (posts.length === 0) {
        return null;
    }

    return (
        <Section id={block.id} tone="light" variant={variant} settings={block.settings}>
            <div className={cn('mx-auto', container(block.settings, 'max-w-6xl'))}>
                <Heading settings={block.settings} variant={variant} />
                <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
                    {posts.slice(0, limit).map((post) => (
                        <PostCard key={post.id} post={post} />
                    ))}
                </div>
                <div className="mt-10 text-center">
                    <Link
                        href="/blog"
                        className="inline-flex items-center gap-2 rounded-full bg-[var(--cp-secondary)] px-7 py-3 font-display font-bold text-white transition hover:scale-[1.02]"
                    >
                        {block.settings.button_label || 'Ver todas las publicaciones'}
                        <ArrowRight className="size-4" />
                    </Link>
                </div>
            </div>
        </Section>
    );
}

const field =
    'h-11 w-full rounded border border-[#ced4da] bg-white px-3 text-[#444] outline-none focus:border-[var(--cp-secondary)] focus:ring-2 focus:ring-[var(--cp-secondary)]/40';

function ContactField({ label, name, error, children, className }: { label: string; name: string; error?: string; children: ReactNode; className?: string }) {
    return (
        <div className={className}>
            <label htmlFor={name} className="mb-2 block">
                {label}
            </label>
            {children}
            {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
        </div>
    );
}

function DetailRow({ icon: Icon, title, children }: { icon: ElementType; title: string; children: ReactNode }) {
    return (
        <div className="flex gap-4">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-[var(--cp-primary)]/10 text-[var(--cp-primary)]">
                <Icon className="size-5" />
            </span>
            <div className="min-w-0">
                <p className="font-display font-semibold text-[var(--cp-primary)]">{title}</p>
                <div className="break-words whitespace-pre-line">{children}</div>
            </div>
        </div>
    );
}

function ContactBlock({ block, variant }: { block: PageBlock; variant: Variant }) {
    const { contact } = useContext(PageDataContext);
    const settings = block.settings;
    const showDetails = settings.show_details !== false && contact && Object.values(contact).some(Boolean);
    const socials = contact
        ? [
              { label: 'Facebook', url: contact.facebook_url },
              { label: 'Instagram', url: contact.instagram_url },
              { label: 'TikTok', url: contact.tiktok_url },
              { label: 'YouTube', url: contact.youtube_url },
          ].filter((social) => social.url)
        : [];

    return (
        <Section id={block.id} tone="light" variant={variant} settings={settings}>
            <div className={cn('mx-auto', container(settings, 'max-w-6xl'))}>
                <Heading settings={settings} variant={variant} />
                <div className={cn('grid gap-8 text-[var(--cp-text)]', showDetails && 'lg:grid-cols-[1fr_2fr]')}>
                    {showDetails && contact && (
                        <aside className="space-y-6 bg-[var(--cp-bg)] p-6 sm:p-8" style={radius}>
                            {contact.contact_email && (
                                <DetailRow icon={Mail} title="Correo">
                                    <a href={`mailto:${contact.contact_email}`} className="text-[var(--cp-primary)] hover:underline">
                                        {contact.contact_email}
                                    </a>
                                </DetailRow>
                            )}
                            {contact.contact_phones && (
                                <DetailRow icon={Phone} title="Teléfonos">
                                    {contact.contact_phones}
                                </DetailRow>
                            )}
                            {contact.contact_hours && (
                                <DetailRow icon={Clock} title="Horario">
                                    {contact.contact_hours}
                                </DetailRow>
                            )}
                            {contact.contact_address && (
                                <DetailRow icon={MapPin} title="Oficina">
                                    {contact.contact_address}
                                    {contact.map_url && (
                                        <a
                                            href={contact.map_url}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="mt-1 block font-semibold text-[var(--cp-primary)] hover:underline"
                                        >
                                            Ver en el mapa
                                        </a>
                                    )}
                                </DetailRow>
                            )}
                            {socials.length > 0 && (
                                <ul className="flex flex-wrap gap-2">
                                    {socials.map((social) => (
                                        <li key={social.label}>
                                            <a
                                                href={social.url ?? undefined}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="inline-block rounded-full border-[1.6px] border-[var(--cp-secondary)] px-4 py-1.5 text-sm font-medium text-[var(--cp-primary)] transition-colors hover:bg-[var(--cp-secondary)] hover:text-white"
                                            >
                                                {social.label}
                                            </a>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </aside>
                    )}

                    <Form
                        {...sendContact.form()}
                        resetOnSuccess
                        options={{ preserveScroll: true }}
                        className="bg-white p-6 shadow-[var(--cp-shadow)] ring-1 ring-black/5 sm:p-8"
                        style={radius}
                    >
                        {({ errors, processing, wasSuccessful }) => (
                            <div className="grid gap-6 sm:grid-cols-2">
                                <ContactField label="Nombre" name="name" error={errors.name}>
                                    <input id="name" name="name" type="text" required maxLength={100} autoComplete="name" className={field} />
                                </ContactField>
                                <ContactField label="Correo" name="email" error={errors.email}>
                                    <input id="email" name="email" type="email" required autoComplete="email" className={field} />
                                </ContactField>
                                <ContactField label="Asunto" name="subject" error={errors.subject} className="sm:col-span-2">
                                    <input id="subject" name="subject" type="text" required maxLength={150} className={field} />
                                </ContactField>
                                <ContactField label="Mensaje" name="message" error={errors.message} className="sm:col-span-2">
                                    <textarea id="message" name="message" rows={8} required maxLength={5000} className={cn(field, 'h-auto py-2')} />
                                </ContactField>

                                {/* Campo trampa para bots: una persona no lo ve. */}
                                <input type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" className="hidden" />

                                <div className="text-center sm:col-span-2">
                                    {wasSuccessful && (
                                        <p role="status" className="mb-4 rounded bg-emerald-600 px-4 py-3 font-semibold text-white">
                                            {settings.success_message || 'Tu mensaje ha sido enviado. ¡Gracias!'}
                                        </p>
                                    )}
                                    <button
                                        type="submit"
                                        disabled={processing}
                                        className="inline-flex items-center gap-2 rounded-full bg-[var(--cp-secondary)] px-9 py-3 font-display font-bold text-white transition hover:scale-[1.02] disabled:opacity-60"
                                    >
                                        {processing ? 'Enviando…' : settings.submit_label || 'Enviar mensaje'}
                                    </button>
                                </div>
                            </div>
                        )}
                    </Form>
                </div>
            </div>
        </Section>
    );
}

const RENDERERS: Record<PageBlock['type'], (props: { block: PageBlock; variant: Variant }) => ReactNode> = {
    hero: () => null,
    rich_text: RichTextBlock,
    image: ImageBlock,
    image_cards: ImageCardsBlock,
    image_features: ImageFeaturesBlock,
    gallery: GalleryBlock,
    stats: StatsBlock,
    why_us: WhyUsBlock,
    process: ProcessBlock,
    testimonials: TestimonialsBlock,
    cta: CtaBlock,
    faqs: FaqBlock,
    semaphore: SemaphoreBlock,
    weather: WeatherBlock,
    associates: AssociatesBlock,
    posts: PostsBlock,
    contact: ContactBlock,
};

export default function PageBlocks({ blocks, theme, data }: { blocks: PageBlock[]; theme: PageTheme; data: PageData }) {
    const variant = Math.min(6, Math.max(1, theme.variant || 6)) as Variant;
    const visible = blocks.filter((block) => block.enabled !== false);
    const firstHeroId = visible[0]?.type === 'hero' ? visible[0].id : null;

    return (
        <PageDataContext.Provider value={data}>
            <div className={cn('custom-page', variantStyles(variant).page)} style={themeVars(theme)}>
                {visible.map((block) => {
                    if (block.type === 'hero') {
                        return <HeroBlock key={block.id} block={block} variant={variant} priority={block.id === firstHeroId} />;
                    }

                    const Renderer = RENDERERS[block.type];

                    return Renderer ? <Renderer key={block.id} block={block} variant={variant} /> : null;
                })}
            </div>
        </PageDataContext.Provider>
    );
}
