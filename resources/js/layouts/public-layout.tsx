import { Link, usePage } from '@inertiajs/react';
import { ArrowUp, Menu, X } from 'lucide-react';
import { useState } from 'react';
import type { ReactNode } from 'react';
import InstallButton from '@/components/install-button';
import { MY_FLIGHT_LOGO, MY_FLIGHT_URL } from '@/components/powered-by';
import { cn } from '@/lib/utils';
import { dashboard, home, login, page } from '@/routes';
import { index as blog } from '@/routes/blog';
import { show as contact } from '@/routes/contact';

const NAV = [
    { label: 'Inicio', href: home.url() },
    { label: 'Quiénes somos', href: page.url('nosotros') },
    { label: 'Proyectos', href: page.url('proyectos') },
    { label: 'Transparencia', href: page.url('transparencia') },
    { label: 'Donar', href: page.url('donar') },
    { label: 'Blog', href: blog.url() },
    { label: 'Contacto', href: contact.url() },
];

/** El blog cuenta como activo también dentro de un artículo. */
const isActive = (href: string, current: string) => {
    const path = current.split(/[?#]/)[0];

    return href === '/' ? path === '/' : path.startsWith(href);
};

function PoweredByTicker() {
    const items = Array.from({ length: 12 }, (_, index) => index);

    return (
        <div className="overflow-hidden bg-[#4a0873] py-1.5 font-display text-xs tracking-[0.25em] text-white/90 uppercase">
            <a
                href={MY_FLIGHT_URL}
                target="_blank"
                rel="noreferrer"
                className="sr-only"
            >
                Powered by My Flight
            </a>
            <div
                aria-hidden="true"
                className="flex w-max animate-marquee hover:[animation-play-state:paused] motion-reduce:animate-none"
            >
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
                                <img
                                    src={MY_FLIGHT_LOGO}
                                    alt=""
                                    className="size-5"
                                />
                                My Flight
                            </a>
                        ))}
                    </div>
                ))}
            </div>
        </div>
    );
}

/**
 * Encabezado con el menú de las páginas públicas y pie del sitio.
 */
export default function PublicLayout({ children }: { children: ReactNode }) {
    const { auth } = usePage().props;
    const { url } = usePage();
    const [menuOpen, setMenuOpen] = useState(false);

    const access = (
        <Link
            href={auth.user ? dashboard() : login()}
            className="rounded-full border-[1.6px] border-brand-soft px-5 py-2 font-semibold whitespace-nowrap transition-colors hover:bg-brand-soft"
        >
            {auth.user ? 'Panel' : 'Acceso empresas'}
        </Link>
    );

    return (
        <div
            id="inicio"
            className="min-h-screen bg-white font-body text-[#444]"
        >
            <header className="sticky top-0 z-40 bg-brand/95 text-white backdrop-blur">
                <PoweredByTicker />
                <div className="mx-auto flex h-20 max-w-6xl items-center justify-between gap-4 px-6">
                    <Link
                        href={home()}
                        className="font-display text-3xl font-medium tracking-[0.3em]"
                    >
                        FEGAT
                    </Link>

                    <nav
                        aria-label="Principal"
                        className="hidden items-center gap-6 text-[15px] xl:flex"
                    >
                        {NAV.map((item) => (
                            <Link
                                key={item.href}
                                href={item.href}
                                aria-current={
                                    isActive(item.href, url)
                                        ? 'page'
                                        : undefined
                                }
                                className="text-white/70 hover:text-white aria-[current=page]:font-semibold aria-[current=page]:text-white"
                            >
                                {item.label}
                            </Link>
                        ))}
                        <InstallButton className="text-white/70 hover:text-white" />
                        {access}
                    </nav>

                    <div className="flex items-center gap-3 xl:hidden">
                        <span className="hidden sm:inline">{access}</span>
                        <button
                            type="button"
                            aria-label={menuOpen ? 'Cerrar menú' : 'Abrir menú'}
                            aria-expanded={menuOpen}
                            aria-controls="menu-movil"
                            onClick={() => setMenuOpen((open) => !open)}
                            className="flex size-10 items-center justify-center rounded-full hover:bg-white/15"
                        >
                            {menuOpen ? (
                                <X className="size-6" />
                            ) : (
                                <Menu className="size-6" />
                            )}
                        </button>
                    </div>
                </div>

                <nav
                    id="menu-movil"
                    aria-label="Principal"
                    className={cn(
                        'border-t border-white/15 px-6 pb-6 xl:hidden',
                        !menuOpen && 'hidden',
                    )}
                >
                    <ul className="mx-auto max-w-6xl divide-y divide-white/10">
                        {NAV.map((item) => (
                            <li key={item.href}>
                                <Link
                                    href={item.href}
                                    onClick={() => setMenuOpen(false)}
                                    aria-current={
                                        isActive(item.href, url)
                                            ? 'page'
                                            : undefined
                                    }
                                    className="block py-3 text-lg text-white/80 hover:text-white aria-[current=page]:font-semibold aria-[current=page]:text-white"
                                >
                                    {item.label}
                                </Link>
                            </li>
                        ))}
                    </ul>
                    <div className="mx-auto mt-4 flex max-w-6xl flex-wrap items-center gap-4 sm:hidden">
                        {access}
                        <InstallButton className="text-white/70 hover:text-white" />
                    </div>
                </nav>
            </header>

            {children}

            <footer className="bg-[#f3f5fa] py-6 text-center text-sm">
                © {new Date().getFullYear()} FEGAT · Federación de Globos
                Aerostáticos Teotihuacán A.C.
                <p className="mt-2 flex items-center justify-center gap-2 font-display text-xs tracking-[0.2em] text-neutral-500 uppercase">
                    Powered by
                    <a
                        href={MY_FLIGHT_URL}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-2 font-bold text-brand hover:underline"
                    >
                        <img src={MY_FLIGHT_LOGO} alt="" className="size-8" />
                        My Flight
                    </a>
                </p>
            </footer>

            <a
                href="#inicio"
                aria-label="Volver arriba"
                className="fixed right-4 bottom-4 z-40 flex size-10 items-center justify-center rounded-full bg-brand-soft text-white shadow hover:bg-brand"
            >
                <ArrowUp className="size-5" />
            </a>
        </div>
    );
}
