import { Link, usePage } from '@inertiajs/react';
import {
    ArrowRight,
    ArrowUp,
    Calendar,
    ChevronDown,
    Clock,
    Facebook,
    Gift,
    Heart,
    Instagram,
    Mail,
    MapPin,
    Menu,
    MessageCircle,
    Phone,
    Star,
    X,
    Youtube,
    Zap,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import type { CSSProperties, ElementType, ReactNode, SVGProps } from 'react';
import InstallButton from '@/components/install-button';
import { MY_FLIGHT_LOGO, MY_FLIGHT_URL } from '@/components/powered-by';
import { cn } from '@/lib/utils';
import { dashboard, login } from '@/routes';
import type { FooterData, HeaderCta, HeaderData, NavItem, SiteLink, SiteShared } from '@/types/site';

const CTA_ICONS: Record<string, ElementType> = { ArrowRight, Calendar, Clock, Gift, Heart, Mail, MapPin, MessageCircle, Phone, Star, Zap };

function TikTok(props: SVGProps<SVGSVGElement>) {
    return (
        <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
            <path d="M19.6 6.7a4.8 4.8 0 0 1-3.8-4.2V2h-3.4v13.4a2.9 2.9 0 1 1-2-2.7V9.2a6.3 6.3 0 1 0 5.4 6.2V8.6a8.2 8.2 0 0 0 3.8 1.2V6.7Z" />
        </svg>
    );
}

const SOCIALS: { key: keyof SiteShared['socials']; label: string; Icon: ElementType; color: string }[] = [
    { key: 'facebook', label: 'Facebook', Icon: Facebook, color: '#1877F2' },
    { key: 'instagram', label: 'Instagram', Icon: Instagram, color: '#E1306C' },
    { key: 'tiktok', label: 'TikTok', Icon: TikTok, color: '#010101' },
    { key: 'youtube', label: 'YouTube', Icon: Youtube, color: '#FF0000' },
];

/** Color con transparencia (#rrggbb + alfa en hex). */
const alpha = (color: string, value: string) => `${color}${value}`;

function linkProps(link: SiteLink) {
    return link.open_in_new_tab ? { target: '_blank', rel: 'noopener noreferrer' } : {};
}

/** Navega con Inertia dentro del sitio; anclas, externos y pestañas nuevas con <a>. */
function SiteAnchor({ link, className, style, onClick, children }: { link: SiteLink; className?: string; style?: CSSProperties; onClick?: () => void; children: ReactNode }) {
    if (link.url.startsWith('/') && !link.url.includes('#') && !link.open_in_new_tab) {
        return (
            <Link href={link.url} className={className} style={style} onClick={onClick}>
                {children}
            </Link>
        );
    }

    return (
        <a href={link.url || '#'} className={className} style={style} onClick={onClick} {...linkProps(link)}>
            {children}
        </a>
    );
}

function PoweredByTicker() {
    const items = Array.from({ length: 12 }, (_, index) => index);

    return (
        <div className="overflow-hidden bg-[#4a0873] py-1.5 font-display text-xs tracking-[0.25em] text-white/90 uppercase">
            <a href={MY_FLIGHT_URL} target="_blank" rel="noreferrer" className="sr-only">
                Powered by My Flight
            </a>
            <div aria-hidden="true" className="flex w-max animate-marquee hover:[animation-play-state:paused] motion-reduce:animate-none">
                {[0, 1].map((half) => (
                    <div key={half} className="flex shrink-0">
                        {items.map((item) => (
                            <a
                                key={item}
                                href={MY_FLIGHT_URL}
                                target="_blank"
                                rel="noreferrer"
                                tabIndex={-1}
                                className="flex items-center gap-2 px-8 whitespace-nowrap hover:text-white hover:underline"
                            >
                                Powered by
                                <img src={MY_FLIGHT_LOGO} alt="" className="size-5" />
                                My Flight
                            </a>
                        ))}
                    </div>
                ))}
            </div>
        </div>
    );
}

function CtaButton({ cta, textColor, className }: { cta: HeaderCta; textColor: string; className?: string }) {
    if (!cta.enabled || !cta.url) {
        return null;
    }

    const isText = cta.content_type !== 'icon';
    const Icon = !isText && cta.icon ? CTA_ICONS[cta.icon] : null;

    return (
        <SiteAnchor
            link={cta}
            className={cn(
                'inline-flex items-center justify-center gap-2 transition-all',
                isText ? 'rounded-full bg-brand-soft px-5 py-2.5 text-sm font-semibold text-white hover:opacity-90' : 'rounded-full p-2 hover:opacity-70',
                className,
            )}
            style={isText ? undefined : { color: textColor }}
        >
            {Icon && <Icon className="size-5" aria-label={cta.label || undefined} />}
            {isText && <span>{cta.label}</span>}
        </SiteAnchor>
    );
}

function NavDropdown({ item, textColor, hoverBg }: { item: NavItem; textColor: string; hoverBg: string }) {
    const [open, setOpen] = useState(false);
    const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const ref = useRef<HTMLDivElement>(null);

    const show = () => {
        if (timer.current) {
            clearTimeout(timer.current);
        }

        setOpen(true);
    };
    const hide = () => {
        timer.current = setTimeout(() => setOpen(false), 130);
    };

    useEffect(() => {
        const onDown = (event: MouseEvent) => {
            if (ref.current && !ref.current.contains(event.target as Node)) {
                setOpen(false);
            }
        };
        document.addEventListener('mousedown', onDown);

        return () => {
            document.removeEventListener('mousedown', onDown);

            if (timer.current) {
                clearTimeout(timer.current);
            }
        };
    }, []);

    return (
        <div ref={ref} className="relative" onMouseEnter={show} onMouseLeave={hide}>
            <button
                type="button"
                onClick={() => setOpen((value) => !value)}
                aria-expanded={open}
                className={cn('inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-[15px] font-medium transition', hoverBg)}
                style={{ color: textColor }}
            >
                {item.label}
                <ChevronDown className={cn('size-3.5 opacity-60 transition-transform', open && 'rotate-180')} />
            </button>
            <div className="absolute top-full left-0 h-3 w-full" />
            <div
                className={cn(
                    'absolute top-[calc(100%+10px)] left-0 z-50 w-60 origin-top-left rounded-2xl border border-zinc-100 bg-white py-2 shadow-[0_20px_60px_rgba(0,0,0,0.12)] transition-all duration-200',
                    open ? 'pointer-events-auto translate-y-0 scale-100 opacity-100' : 'pointer-events-none -translate-y-1 scale-95 opacity-0',
                )}
            >
                {item.url && (
                    <SiteAnchor
                        link={item}
                        onClick={() => setOpen(false)}
                        className="mx-2 mb-1 flex rounded-xl px-3 py-2.5 text-sm font-semibold text-brand hover:bg-[#f5f0fa]"
                    >
                        {item.label}
                    </SiteAnchor>
                )}
                {item.children.map((child) => (
                    <SiteAnchor
                        key={child.id}
                        link={child}
                        onClick={() => setOpen(false)}
                        className="group mx-2 mb-0.5 flex items-center justify-between rounded-xl px-3 py-2.5 text-sm text-zinc-600 transition hover:bg-[#f5f0fa] hover:text-brand"
                    >
                        <span>{child.label}</span>
                        <ArrowRight className="size-3.5 opacity-0 transition group-hover:opacity-100" />
                    </SiteAnchor>
                ))}
            </div>
        </div>
    );
}

function isCurrent(url: string, current: string) {
    const path = current.split(/[?#]/)[0];

    return url === '/' ? path === '/' : url.startsWith('/') && !url.includes('#') && path.startsWith(url);
}

function PublicHeader({ header, transparent }: { header: HeaderData; transparent: boolean }) {
    const { auth } = usePage().props;
    const { url } = usePage();
    const [scrolled, setScrolled] = useState(false);
    const [mobileOpen, setMobileOpen] = useState(false);
    const [expanded, setExpanded] = useState<Set<string>>(new Set());

    useEffect(() => {
        if (!transparent) {
            return;
        }

        const onScroll = () => setScrolled(window.scrollY > 10);
        onScroll();
        window.addEventListener('scroll', onScroll, { passive: true });

        return () => window.removeEventListener('scroll', onScroll);
    }, [transparent]);

    useEffect(() => {
        document.body.style.overflow = mobileOpen ? 'hidden' : '';

        if (!mobileOpen) {
            setExpanded(new Set());
        }

        return () => {
            document.body.style.overflow = '';
        };
    }, [mobileOpen]);

    const solid = !transparent || scrolled;
    const textColor = solid ? header.text_color : '#ffffff';
    const hoverBg = solid ? 'hover:bg-black/[0.06]' : 'hover:bg-white/10';
    const isCenter = header.logo_position === 'center';
    const logo = header.logo ? (
        <img src={header.logo} alt="FEGAT" className="w-auto object-contain" style={{ height: header.logo_size, maxWidth: header.logo_size * 4.6 }} />
    ) : (
        <span className="font-display text-3xl font-medium tracking-[0.3em]" style={{ color: textColor }}>
            FEGAT
        </span>
    );
    const access = header.show_access_button && (
        <Link
            href={auth.user ? dashboard() : login()}
            className="rounded-full border-[1.6px] border-brand-soft px-5 py-2 text-sm font-semibold whitespace-nowrap transition-colors hover:bg-brand-soft hover:text-white"
            style={{ color: textColor }}
        >
            {auth.user ? 'Panel' : 'Acceso empresas'}
        </Link>
    );

    return (
        <>
            <header
                className={cn(
                    'z-40 w-full transition-colors duration-300',
                    transparent ? 'fixed inset-x-0 top-0' : header.sticky ? 'sticky top-0' : 'relative',
                    solid && 'shadow-[0_1px_0_rgba(0,0,0,0.08)]',
                )}
                style={{ backgroundColor: solid ? header.background_color : 'transparent' }}
            >
                {header.show_ticker && <PoweredByTicker />}
                <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                    <div className="relative flex h-20 items-center justify-between gap-4">
                        {!isCenter && (
                            <Link href="/" className="shrink-0 transition-opacity hover:opacity-80">
                                {logo}
                            </Link>
                        )}

                        <nav aria-label="Principal" className={cn('hidden items-center gap-0.5 lg:flex', isCenter && 'flex-1')}>
                            {header.nav_items.map((item) =>
                                item.children.length > 0 ? (
                                    <NavDropdown key={item.id} item={item} textColor={textColor} hoverBg={hoverBg} />
                                ) : (
                                    <SiteAnchor
                                        key={item.id}
                                        link={item}
                                        className={cn(
                                            'rounded-full px-3.5 py-2 text-[15px] font-medium transition',
                                            hoverBg,
                                            isCurrent(item.url, url) && 'font-bold underline decoration-2 underline-offset-8',
                                        )}
                                        style={{ color: textColor }}
                                    >
                                        {item.label}
                                    </SiteAnchor>
                                ),
                            )}
                        </nav>

                        {isCenter && (
                            <Link href="/" className="absolute left-1/2 shrink-0 -translate-x-1/2 transition-opacity hover:opacity-80">
                                {logo}
                            </Link>
                        )}

                        <div className="flex shrink-0 items-center gap-2">
                            <InstallButton className="hidden text-sm lg:inline" />
                            <CtaButton cta={header.cta} textColor={textColor} className="hidden lg:inline-flex" />
                            <span className="hidden sm:inline">{access}</span>
                            <button
                                type="button"
                                onClick={() => setMobileOpen((open) => !open)}
                                aria-label={mobileOpen ? 'Cerrar menú' : 'Abrir menú'}
                                aria-expanded={mobileOpen}
                                className={cn(
                                    'flex size-10 items-center justify-center rounded-full border transition lg:hidden',
                                    solid ? 'border-current/20' : 'border-white/25 bg-white/10 backdrop-blur-sm',
                                )}
                                style={{ color: textColor }}
                            >
                                {mobileOpen ? <X className="size-5" /> : <Menu className="size-5" />}
                            </button>
                        </div>
                    </div>
                </div>
            </header>

            <div
                onClick={() => setMobileOpen(false)}
                className={cn(
                    'fixed inset-0 z-40 bg-black/40 backdrop-blur-[2px] transition-opacity duration-300 lg:hidden',
                    mobileOpen ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0',
                )}
            />

            <div
                className={cn(
                    'fixed inset-y-0 right-0 z-50 flex w-[84%] max-w-[360px] flex-col shadow-[-20px_0_60px_rgba(0,0,0,0.18)] transition-transform duration-300 ease-out lg:hidden',
                    mobileOpen ? 'translate-x-0' : 'translate-x-full',
                )}
                style={{ backgroundColor: header.background_color, color: header.text_color }}
                aria-hidden={!mobileOpen}
            >
                <div className="flex h-20 items-center justify-between border-b border-current/10 px-5">
                    <span className="font-display text-2xl tracking-[0.3em]">FEGAT</span>
                    <button
                        type="button"
                        onClick={() => setMobileOpen(false)}
                        aria-label="Cerrar menú"
                        className="flex size-9 items-center justify-center rounded-full border border-current/20"
                    >
                        <X className="size-4" />
                    </button>
                </div>
                <nav aria-label="Principal" className="flex-1 space-y-1 overflow-y-auto px-4 py-4">
                    {header.nav_items.map((item) => {
                        const isExpanded = expanded.has(item.id);

                        return (
                            <div key={item.id}>
                                <div className="flex items-center gap-1">
                                    <SiteAnchor
                                        link={item}
                                        onClick={() => setMobileOpen(false)}
                                        className="flex min-w-0 flex-1 rounded-xl px-4 py-3 text-base font-semibold hover:bg-black/10"
                                    >
                                        <span className="truncate">{item.label}</span>
                                    </SiteAnchor>
                                    {item.children.length > 0 && (
                                        <button
                                            type="button"
                                            onClick={() =>
                                                setExpanded((previous) => {
                                                    const next = new Set(previous);

                                                    if (!next.delete(item.id)) {
                                                        next.add(item.id);
                                                    }

                                                    return next;
                                                })
                                            }
                                            aria-label={`Ver opciones de ${item.label}`}
                                            aria-expanded={isExpanded}
                                            className="flex size-11 shrink-0 items-center justify-center rounded-xl hover:bg-black/10"
                                        >
                                            <ChevronDown className={cn('size-4 opacity-60 transition-transform', isExpanded && 'rotate-180')} />
                                        </button>
                                    )}
                                </div>
                                {isExpanded && (
                                    <div className="mt-0.5 ml-4 space-y-0.5 border-l-2 border-current/20 pl-3">
                                        {item.children.map((child) => (
                                            <SiteAnchor
                                                key={child.id}
                                                link={child}
                                                onClick={() => setMobileOpen(false)}
                                                className="block rounded-lg px-3 py-2.5 text-sm opacity-80 hover:bg-black/10"
                                            >
                                                {child.label}
                                            </SiteAnchor>
                                        ))}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </nav>
                <div className="space-y-3 border-t border-current/10 px-4 py-4">
                    <CtaButton cta={header.cta} textColor={header.text_color} className="w-full" />
                    <div className="flex flex-wrap items-center gap-3 sm:hidden">{access}</div>
                    <InstallButton className="text-sm" />
                </div>
            </div>
        </>
    );
}

function PublicFooter({ footer, socials, contact }: { footer: FooterData; socials: SiteShared['socials']; contact: SiteShared['contact'] }) {
    const text = footer.text_color;
    const muted = alpha(text, 'b3');
    const divide = alpha(text, '1f');
    const active = SOCIALS.filter((social) => socials[social.key]);
    const columns = footer.columns.filter((column) => column.title || column.links.length > 0);

    return (
        <footer style={{ backgroundColor: footer.background_color, color: text }}>
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                <div className="flex flex-col gap-6 py-8 sm:flex-row sm:items-center sm:justify-between">
                    <Link href="/" className="font-display text-3xl font-medium tracking-[0.3em]">
                        FEGAT
                    </Link>
                    {footer.show_socials && active.length > 0 && (
                        <div className="flex flex-wrap gap-3">
                            {active.map(({ key, label, Icon, color }) => (
                                <a
                                    key={key}
                                    href={socials[key] ?? undefined}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    aria-label={label}
                                    title={label}
                                    className="flex size-11 items-center justify-center rounded-2xl border transition hover:-translate-y-0.5 hover:border-transparent hover:text-white hover:[background-color:var(--social)]"
                                    style={{ borderColor: alpha(text, '33'), '--social': color } as CSSProperties}
                                >
                                    <Icon className="size-5" />
                                </a>
                            ))}
                        </div>
                    )}
                </div>

                <div className="grid gap-10 border-y py-10 lg:grid-cols-[minmax(220px,0.8fr)_minmax(0,2fr)]" style={{ borderColor: divide }}>
                    <div className="space-y-5">
                        {footer.description && (
                            <p className="max-w-xs text-sm leading-7" style={{ color: muted }}>
                                {footer.description}
                            </p>
                        )}
                        {footer.show_contact && (contact.email || contact.phones) && (
                            <div className="flex flex-col gap-2.5 text-sm">
                                {contact.email && (
                                    <a href={`mailto:${contact.email}`} className="inline-flex w-fit items-center gap-2 font-semibold hover:underline">
                                        <Mail className="size-4 opacity-70" />
                                        {contact.email}
                                    </a>
                                )}
                                {contact.phones && (
                                    <span className="inline-flex w-fit items-center gap-2 font-semibold">
                                        <Phone className="size-4 opacity-70" />
                                        {contact.phones}
                                    </span>
                                )}
                            </div>
                        )}
                    </div>

                    {columns.length > 0 && (
                        <div className={cn('grid gap-x-8 gap-y-8', columns.length === 1 ? 'grid-cols-1' : columns.length === 2 ? 'sm:grid-cols-2' : 'sm:grid-cols-2 xl:grid-cols-4')}>
                            {columns.map((column) => (
                                <nav key={column.id} aria-label={column.title || 'Footer'} className="min-w-0">
                                    {column.title && <p className="mb-4 text-xs font-bold tracking-[0.2em] uppercase">{column.title}</p>}
                                    <ul className="space-y-2.5">
                                        {column.links.map((link) => (
                                            <li key={link.id}>
                                                <SiteAnchor
                                                    link={link}
                                                    className="inline-flex max-w-full text-sm leading-5 transition hover:underline hover:underline-offset-4"
                                                    style={{ color: muted }}
                                                >
                                                    <span className="truncate">{link.label}</span>
                                                </SiteAnchor>
                                            </li>
                                        ))}
                                    </ul>
                                </nav>
                            ))}
                        </div>
                    )}
                </div>

                <div className="flex flex-col items-start justify-between gap-3 py-5 text-xs sm:flex-row sm:items-center" style={{ color: muted }}>
                    <p>
                        © {new Date().getFullYear()} {footer.copyright || 'FEGAT · Federación de Globos Aerostáticos Teotihuacán A.C.'}
                    </p>
                    <a
                        href={MY_FLIGHT_URL}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-2 font-display tracking-[0.2em] uppercase hover:underline"
                    >
                        Powered by
                        <img src={MY_FLIGHT_LOGO} alt="" className="size-6" />
                        <span className="font-bold">My Flight</span>
                    </a>
                </div>
            </div>
        </footer>
    );
}

/**
 * Header y footer del sitio público, configurados en «Sitio público» del panel.
 * `transparentHero`: en el inicio el header puede ir transparente sobre el hero.
 */
export default function PublicLayout({ children, transparentHero = false }: { children: ReactNode; transparentHero?: boolean }) {
    const { site } = usePage().props;
    const transparent = transparentHero && site.header.transparent_home;

    return (
        <div
            id="inicio"
            className={cn('min-h-screen bg-white font-body text-[#444]', transparent && '[&_main>.custom-page>section:first-child]:pt-40')}
        >
            <PublicHeader header={site.header} transparent={transparent} />

            {children}

            <PublicFooter footer={site.footer} socials={site.socials} contact={site.contact} />

            <a
                href="#inicio"
                aria-label="Volver arriba"
                className="fixed right-4 bottom-4 z-30 flex size-10 items-center justify-center rounded-full bg-brand-soft text-white shadow hover:bg-brand"
            >
                <ArrowUp className="size-5" />
            </a>
        </div>
    );
}
