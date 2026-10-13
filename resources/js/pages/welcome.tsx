import { Form, Head, Link, usePoll } from '@inertiajs/react';
import type { ReactNode } from 'react';
import PostCard from '@/components/public/post-card';
import type { PostSummary } from '@/components/public/post-card';
import SectionTitle from '@/components/public/section-title';
import SemaphoreCard from '@/components/semaphore-card';
import PublicLayout from '@/layouts/public-layout';
import { describeSemaphore } from '@/lib/semaphore';
import { cn } from '@/lib/utils';
import { index as blogIndex } from '@/routes/blog';
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

type HomeContent = {
    hero_title: string;
    hero_text: string | null;
    semaphore_text: string;
    contact_text: string;
};

type HomeSection = {
    id: number;
    title: string;
    body: string;
    image_url: string | null;
};

function InfoSection({
    section,
    index,
}: {
    section: HomeSection;
    index: number;
}) {
    return (
        <section
            id={`seccion-${section.id}`}
            className={cn(
                'scroll-mt-28 px-6 py-16',
                index % 2 === 0 && 'bg-[#f3f5fa]',
            )}
        >
            <SectionTitle title={section.title} />

            <div
                className={cn(
                    'mx-auto mt-10 text-lg leading-relaxed',
                    section.image_url
                        ? 'grid max-w-6xl items-center gap-10 md:grid-cols-2'
                        : 'max-w-3xl',
                )}
            >
                {section.image_url && (
                    <img
                        src={section.image_url}
                        alt=""
                        loading="lazy"
                        className={cn(
                            'w-full rounded-lg object-cover shadow-[0_0_24px_rgba(0,0,0,0.12)]',
                            index % 2 === 1 && 'md:order-last',
                        )}
                    />
                )}
                {/* El servidor sanea este HTML al guardarlo (App\Support\RichText). */}
                <div
                    className="rich-text [&_a]:text-brand [&_h2]:text-brand [&_h3]:text-brand [&_h4]:text-brand"
                    dangerouslySetInnerHTML={{ __html: section.body }}
                />
            </div>
        </section>
    );
}

export default function Welcome({
    semaphore,
    content,
    sections,
    posts,
    companies,
    heroImage,
}: {
    semaphore: SemaphoreData | null;
    content: HomeContent;
    sections: HomeSection[];
    posts: PostSummary[];
    companies: Company[];
    heroImage: string | null;
}) {
    usePoll(15000, { only: ['semaphore'] });

    return (
        <>
            <Head title="Federación de Globos Aerostáticos Teotihuacan" />

            <PublicLayout
                showSemaphore={semaphore !== null}
                showBlog={posts.length > 0}
            >
                <section className="overflow-hidden bg-brand text-white">
                    <div className="mx-auto grid max-w-6xl items-center gap-10 px-6 py-16 md:min-h-[440px] md:grid-cols-2 md:py-10">
                        <div>
                            <h1 className="font-display text-4xl leading-[1.17] font-bold text-balance uppercase sm:text-5xl">
                                {content.hero_title}
                            </h1>

                            {content.hero_text && (
                                <p className="mt-4 max-w-xl text-lg text-white/85">
                                    {content.hero_text}
                                </p>
                            )}

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
                                {content.semaphore_text}
                            </SectionTitle>

                            <SemaphoreCard
                                semaphore={semaphore}
                                tone="light"
                                className="mx-auto mt-10 max-w-4xl shadow-[0_0_30px_rgba(0,0,0,0.15)]"
                            />
                        </section>
                    )}

                    {sections.map((section, index) => (
                        <InfoSection
                            key={section.id}
                            section={section}
                            index={index}
                        />
                    ))}

                    {posts.length > 0 && (
                        <section
                            id="blog"
                            className="scroll-mt-28 border-t border-neutral-200 px-6 py-16"
                        >
                            <SectionTitle title="Blog">
                                Noticias y artículos de la federación.
                            </SectionTitle>

                            <div className="mx-auto mt-10 grid max-w-6xl gap-8 md:grid-cols-3">
                                {posts.map((post) => (
                                    <PostCard key={post.id} post={post} />
                                ))}
                            </div>

                            <div className="mt-10 text-center">
                                <Link href={blogIndex()} className={pill}>
                                    Ver todas las publicaciones
                                </Link>
                            </div>
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
                            {content.contact_text}
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
            </PublicLayout>
        </>
    );
}
