import type { CSSProperties } from 'react';
import { ArrowLeft } from 'lucide-react';
import { MY_FLIGHT_LOGO, MY_FLIGHT_URL } from '@/components/powered-by';
import { home } from '@/routes';
import type { AuthLayoutProps } from '@/types';

/**
 * Colores del sitio público para el formulario. Las pantallas de acceso
 * siempre se ven en claro, como la página de FEGAT, aunque el panel esté en
 * modo oscuro.
 */
const brandColors: Record<string, string> = {
    background: '#ffffff',
    foreground: '#2b2233',
    card: '#ffffff',
    'card-foreground': '#2b2233',
    popover: '#ffffff',
    'popover-foreground': '#2b2233',
    primary: '#6c0ea3',
    'primary-foreground': '#ffffff',
    secondary: '#f3eafa',
    'secondary-foreground': '#4a0873',
    accent: '#f3eafa',
    'accent-foreground': '#4a0873',
    muted: '#f3f5fa',
    'muted-foreground': '#6b6475',
    border: '#ced4da',
    input: '#ced4da',
    ring: '#c699e1',
};

// Tailwind resuelve --color-* en la raíz, así que se redefinen ambos nombres.
const brandTheme = {
    ...Object.fromEntries(
        Object.entries(brandColors).flatMap(([name, value]) => [
            [`--${name}`, value],
            [`--color-${name}`, value],
        ]),
    ),
    colorScheme: 'light',
} as CSSProperties;

function PoweredByMyFlight({ className }: { className?: string }) {
    return (
        <a
            href={MY_FLIGHT_URL}
            target="_blank"
            rel="noreferrer"
            className={`inline-flex items-center gap-2 font-display text-xs tracking-[0.2em] uppercase hover:underline ${className ?? ''}`}
        >
            Powered by
            <img src={MY_FLIGHT_LOGO} alt="" className="size-6" />
            <span className="font-bold">My Flight</span>
        </a>
    );
}

export default function AuthFegatLayout({
    children,
    title,
    description,
}: AuthLayoutProps) {
    return (
        <div className="flex min-h-svh bg-white font-body" style={brandTheme}>
            {/* Panel de marca: solo en pantallas medianas y grandes. */}
            <aside className="relative hidden w-[44%] max-w-2xl flex-col justify-between overflow-hidden bg-brand p-10 text-white lg:flex">
                <div className="absolute -right-24 -bottom-24 size-96 rounded-full bg-brand-soft/20" />

                <a
                    href={home.url()}
                    className="relative font-display text-3xl font-medium tracking-[0.3em]"
                >
                    FEGAT
                </a>

                <div className="relative flex flex-col items-start gap-8">
                    <img
                        src="/images/fegat-icon.png"
                        alt="Logotipo de FEGAT"
                        className="h-56 w-auto animate-float"
                    />
                    <h2 className="font-display text-4xl leading-tight font-bold text-balance uppercase">
                        Federación de Globos Aerostáticos Teotihuacan
                    </h2>
                    <p className="max-w-md text-lg text-white/80">
                        Plataforma de las empresas asociadas: semáforo de
                        vuelos, votación diaria y clima de la zona.
                    </p>
                </div>

                <PoweredByMyFlight className="relative text-white/80" />
            </aside>

            <main className="flex flex-1 flex-col">
                {/* Encabezado de marca en celular. */}
                <header className="flex h-16 items-center justify-between bg-brand px-6 text-white lg:hidden">
                    <a
                        href={home.url()}
                        className="font-display text-2xl font-medium tracking-[0.3em]"
                    >
                        FEGAT
                    </a>
                </header>

                <div className="flex flex-1 flex-col items-center justify-center px-6 py-10 sm:px-10">
                    <div className="w-full max-w-md">
                        <a
                            href={home.url()}
                            className="mb-10 inline-flex items-center gap-2 text-sm text-[#6b6475] hover:text-brand"
                        >
                            <ArrowLeft className="size-4" />
                            Volver al sitio
                        </a>

                        <div className="mb-8">
                            <div className="mb-5 h-1 w-14 rounded-full bg-brand-soft" />
                            <h1 className="font-display text-3xl leading-tight font-semibold text-brand uppercase">
                                {title}
                            </h1>
                            {description && (
                                <p className="mt-3 text-[#6b6475]">
                                    {description}
                                </p>
                            )}
                        </div>

                        {/* Botones en píldora y campos más altos, como en el sitio público. */}
                        <div className="text-[#2b2233] [&_[data-slot=button]]:h-11 [&_[data-slot=button]]:rounded-full [&_[data-slot=button]]:font-display [&_[data-slot=button]]:tracking-wide [&_[data-slot=input]]:h-11 [&_[data-slot=input]]:bg-white">
                            {children}
                        </div>
                    </div>
                </div>

                <footer className="flex justify-center border-t border-[#ced4da] py-5 text-[#6b6475]">
                    <PoweredByMyFlight />
                </footer>
            </main>
        </div>
    );
}
