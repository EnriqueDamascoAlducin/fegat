import { Form, Head, Link, usePage, usePoll } from '@inertiajs/react';
import { ArrowUp } from 'lucide-react';
import type { ReactNode } from 'react';
import InstallButton from '@/components/install-button';
import SemaphoreCard from '@/components/semaphore-card';
import { describeSemaphore } from '@/lib/semaphore';
import { cn } from '@/lib/utils';
import { dashboard, login } from '@/routes';
import { store as sendContact } from '@/routes/contact';
import type { SemaphoreData, SemaphoreStatus } from '@/types';

type Company = {
    id: number;
    name: string;
    website_url: string | null;
    logo_url: string | null;
};

const STATUS_DOT: Record<SemaphoreStatus, string> = {
    green: 'bg-emerald-400',
    yellow: 'bg-amber-300',
    red: 'bg-red-400',
    waiting: 'animate-pulse bg-white/60',
    not_open: 'bg-white/60',
};

const pill =
    'inline-block rounded-full bg-brand-soft px-7 py-2.5 font-display font-medium tracking-wide text-white transition-colors hover:bg-[#b57fd6]';

const field =
    'h-11 w-full rounded border border-[#ced4da] bg-white px-3 text-[#444] outline-none focus:border-brand-soft focus:ring-2 focus:ring-brand-soft/40';

function SectionTitle({
    title,
    children,
}: {
    title: string;
    children: ReactNode;
}) {
    return (
        <div className="text-center">
            <h2 className="font-display text-[32px] leading-tight font-bold text-brand uppercase">
                {title}
            </h2>
            <div className="relative mx-auto mt-5 h-px w-32 bg-neutral-300">
                <span className="absolute -top-px left-1/2 h-[3px] w-10 -translate-x-1/2 bg-brand-soft" />
            </div>
            <p className="mt-6">{children}</p>
        </div>
    );
}

function CompanyLogo({ company }: { company: Company }) {
    const content = company.logo_url ? (
        <img
            src={company.logo_url}
            alt={company.name}
            loading="lazy"
            className="mx-auto max-h-24 w-auto max-w-full object-contain grayscale transition duration-300 group-hover:scale-105 group-hover:grayscale-0"
        />
    ) : (
        <span className="font-display text-xl font-medium text-neutral-500 transition-colors group-hover:text-brand">
            {company.name}
        </span>
    );
    const className =
        'group flex h-36 items-center justify-center px-6 text-center';

    return company.website_url ? (
        <a
            href={company.website_url}
            target="_blank"
            rel="noreferrer"
            className={className}
        >
            {content}
        </a>
    ) : (
        <div className={className}>{content}</div>
    );
}

function ContactField({
    label,
    name,
    error,
    children,
    className,
}: {
    label: string;
    name: string;
    error?: string;
    children: ReactNode;
    className?: string;
}) {
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

const MY_FLIGHT_URL = 'https://myflight.com.mx/';

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

export default function Welcome({
    semaphore,
    companies,
    heroImage,
}: {
    semaphore: SemaphoreData | null;
    companies: Company[];
    heroImage: string | null;
}) {
    const { auth } = usePage().props;

    usePoll(15000, { only: ['semaphore'] });

    return (
        <>
            <Head title="Federación de Globos Aerostáticos Teotihuacan" />

            <div
                id="inicio"
                className="min-h-screen bg-white font-body text-[#444]"
            >
                <header className="sticky top-0 z-40 bg-brand/95 text-white backdrop-blur">
                    <PoweredByTicker />
                    <div className="mx-auto flex h-20 max-w-6xl items-center justify-between gap-4 px-6">
                        <a
                            href="#inicio"
                            className="font-display text-3xl font-medium tracking-[0.3em]"
                        >
                            FEGAT
                        </a>
                        <nav className="flex items-center gap-5 text-[15px] sm:gap-7">
                            <a
                                href="#inicio"
                                className="hidden text-white/70 hover:text-white md:inline"
                            >
                                Inicio
                            </a>
                            {semaphore && (
                                <a
                                    href="#semaforo"
                                    className="hidden text-white/70 hover:text-white sm:inline"
                                >
                                    Semáforo
                                </a>
                            )}
                            <a
                                href="#contacto"
                                className="hidden text-white/70 hover:text-white sm:inline"
                            >
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

                <section className="overflow-hidden bg-brand text-white">
                    <div className="mx-auto grid max-w-6xl items-center gap-10 px-6 py-16 md:min-h-[440px] md:grid-cols-2 md:py-10">
                        <div>
                            <h1 className="font-display text-4xl leading-[1.17] font-bold text-balance uppercase sm:text-5xl">
                                Federación de Globos Aerostáticos Teotihuacan
                                A.C
                            </h1>

                            {semaphore && (
                                <a
                                    href="#semaforo"
                                    className="mt-6 inline-flex items-center gap-3 rounded-full bg-white/15 px-5 py-3 text-lg font-semibold ring-1 ring-white/30 hover:bg-white/25"
                                >
                                    <span
                                        className={cn(
                                            'size-4 rounded-full',
                                            STATUS_DOT[semaphore.status],
                                        )}
                                    />
                                    Hoy: {describeSemaphore(semaphore).title}
                                </a>
                            )}

                            <div className="mt-7 flex flex-wrap gap-3">
                                {semaphore && (
                                    <a href="#semaforo" className={pill}>
                                        Ver semáforo
                                    </a>
                                )}
                                <a
                                    href="#contacto"
                                    className="inline-block rounded-full border-[1.6px] border-brand-soft px-7 py-2.5 font-display font-medium tracking-wide transition-colors hover:bg-brand-soft"
                                >
                                    Contacto
                                </a>
                            </div>
                        </div>

                        {heroImage && (
                            <img
                                src={heroImage}
                                alt="Logotipo de FEGAT"
                                className="mx-auto max-h-[400px] w-auto animate-float"
                            />
                        )}
                    </div>
                </section>

                <main>
                    {semaphore && (
                        <section
                            id="semaforo"
                            className="scroll-mt-28 px-6 py-16"
                        >
                            <SectionTitle title="Semáforo de vuelos">
                                Las empresas asociadas evalúan las condiciones
                                de cada jornada y deciden en conjunto si es
                                viable volar.
                            </SectionTitle>

                            <SemaphoreCard
                                semaphore={semaphore}
                                tone="light"
                                className="mx-auto mt-10 max-w-4xl shadow-[0_0_30px_rgba(0,0,0,0.15)]"
                            />
                        </section>
                    )}

                    <section
                        id="empresas"
                        className="scroll-mt-28 bg-[#f3f5fa] px-6 py-6"
                    >
                        <h2 className="sr-only">Empresas asociadas</h2>
                        <ul className="mx-auto grid max-w-6xl grid-cols-2 lg:grid-cols-4">
                            {companies.map((company) => (
                                <li key={company.id}>
                                    <CompanyLogo company={company} />
                                </li>
                            ))}
                        </ul>
                    </section>

                    <section id="contacto" className="scroll-mt-28 px-6 py-16">
                        <SectionTitle title="Contacto">
                            Contáctanos para cualquier duda y/o aclaración.
                        </SectionTitle>

                        <Form
                            {...sendContact.form()}
                            resetOnSuccess
                            options={{ preserveScroll: true }}
                            className="mx-auto mt-10 max-w-6xl border-y-[2.4px] border-brand-soft bg-white p-6 shadow-[0_0_24px_rgba(0,0,0,0.12)] sm:p-8"
                        >
                            {({ errors, processing, wasSuccessful }) => (
                                <div className="grid gap-6 sm:grid-cols-2">
                                    <ContactField
                                        label="Nombre"
                                        name="name"
                                        error={errors.name}
                                    >
                                        <input
                                            id="name"
                                            name="name"
                                            type="text"
                                            required
                                            maxLength={100}
                                            autoComplete="name"
                                            className={field}
                                        />
                                    </ContactField>

                                    <ContactField
                                        label="Correo"
                                        name="email"
                                        error={errors.email}
                                    >
                                        <input
                                            id="email"
                                            name="email"
                                            type="email"
                                            required
                                            autoComplete="email"
                                            className={field}
                                        />
                                    </ContactField>

                                    <ContactField
                                        label="Asunto"
                                        name="subject"
                                        error={errors.subject}
                                        className="sm:col-span-2"
                                    >
                                        <input
                                            id="subject"
                                            name="subject"
                                            type="text"
                                            required
                                            maxLength={150}
                                            className={field}
                                        />
                                    </ContactField>

                                    <ContactField
                                        label="Mensaje"
                                        name="message"
                                        error={errors.message}
                                        className="sm:col-span-2"
                                    >
                                        <textarea
                                            id="message"
                                            name="message"
                                            rows={9}
                                            required
                                            maxLength={5000}
                                            className={cn(field, 'h-auto py-2')}
                                        />
                                    </ContactField>

                                    <input
                                        type="text"
                                        name="website"
                                        tabIndex={-1}
                                        autoComplete="off"
                                        aria-hidden="true"
                                        className="hidden"
                                    />

                                    <div className="text-center sm:col-span-2">
                                        {wasSuccessful && (
                                            <p
                                                role="status"
                                                className="mb-4 rounded bg-emerald-600 px-4 py-3 font-semibold text-white"
                                            >
                                                Tu mensaje ha sido enviado.
                                                ¡Gracias!
                                            </p>
                                        )}
                                        <button
                                            type="submit"
                                            disabled={processing}
                                            className={cn(
                                                pill,
                                                'px-9 py-3 disabled:opacity-60',
                                            )}
                                        >
                                            {processing
                                                ? 'Enviando…'
                                                : 'Enviar correo'}
                                        </button>
                                    </div>
                                </div>
                            )}
                        </Form>
                    </section>
                </main>

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
        </>
    );
}
