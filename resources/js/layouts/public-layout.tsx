import { Link, usePage } from '@inertiajs/react';
import { ArrowUp } from 'lucide-react';
import type { ReactNode } from 'react';
import InstallButton from '@/components/install-button';
import { dashboard, login } from '@/routes';
import { index as blog } from '@/routes/blog';

const MY_FLIGHT_URL = 'https://myflight.com.mx/';

const navLink = 'hidden text-white/70 hover:text-white sm:inline';

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
                                className="px-8 whitespace-nowrap hover:text-white hover:underline"
                            >
                                Powered by My Flight
                            </a>
                        ))}
                    </div>
                ))}
            </div>
        </div>
    );
}

/**
 * Encabezado y pie del sitio público. Los enlaces a secciones del inicio usan
 * «/#seccion» para que también funcionen desde las páginas del blog.
 */
export default function PublicLayout({
    children,
    showSemaphore = false,
    showBlog = false,
}: {
    children: ReactNode;
    showSemaphore?: boolean;
    showBlog?: boolean;
}) {
    const { auth } = usePage().props;

    return (
        <div
            id="inicio"
            className="min-h-screen bg-white font-body text-[#444]"
        >
            <header className="sticky top-0 z-40 bg-brand/95 text-white backdrop-blur">
                <PoweredByTicker />
                <div className="mx-auto flex h-20 max-w-6xl items-center justify-between gap-4 px-6">
                    <a
                        href="/#inicio"
                        className="font-display text-3xl font-medium tracking-[0.3em]"
                    >
                        FEGAT
                    </a>
                    <nav className="flex items-center gap-5 text-[15px] sm:gap-7">
                        <a
                            href="/#inicio"
                            className="hidden text-white/70 hover:text-white md:inline"
                        >
                            Inicio
                        </a>
                        {showSemaphore && (
                            <a href="/#semaforo" className={navLink}>
                                Semáforo
                            </a>
                        )}
                        {showBlog && (
                            <Link href={blog()} className={navLink}>
                                Blog
                            </Link>
                        )}
                        <a href="/#contacto" className={navLink}>
                            Contacto
                        </a>
                        <InstallButton className="text-white/70 hover:text-white" />
                        <Link
                            href={auth.user ? dashboard() : login()}
                            className="rounded-full border-[1.6px] border-brand-soft px-5 py-2 font-semibold whitespace-nowrap transition-colors hover:bg-brand-soft"
                        >
                            {auth.user ? 'Panel' : 'Acceso empresas'}
                        </Link>
                    </nav>
                </div>
            </header>

            {children}

            <footer className="bg-[#f3f5fa] py-6 text-center text-sm">
                © {new Date().getFullYear()} FEGAT · Federación de Globos
                Aerostáticos Teotihuacan A.C.
                <p className="mt-2 font-display text-xs tracking-[0.2em] text-neutral-500 uppercase">
                    Powered by{' '}
                    <a
                        href={MY_FLIGHT_URL}
                        target="_blank"
                        rel="noreferrer"
                        className="font-bold text-brand hover:underline"
                    >
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
