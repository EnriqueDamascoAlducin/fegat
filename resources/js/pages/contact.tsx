import { Form, Head } from '@inertiajs/react';
import { Clock, Mail, MapPin, Phone } from 'lucide-react';
import type { ReactNode } from 'react';
import { pill } from '@/components/public/buttons';
import SectionTitle from '@/components/public/section-title';
import PublicLayout from '@/layouts/public-layout';
import { cn } from '@/lib/utils';
import { store as sendContact } from '@/routes/contact';

type ContactDetails = {
    contact_email: string | null;
    contact_phones: string | null;
    contact_hours: string | null;
    contact_address: string | null;
    map_url: string | null;
    facebook_url: string | null;
    instagram_url: string | null;
    tiktok_url: string | null;
    youtube_url: string | null;
};

const field =
    'h-11 w-full rounded border border-[#ced4da] bg-white px-3 text-[#444] outline-none focus:border-brand-soft focus:ring-2 focus:ring-brand-soft/40';

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

function DetailRow({
    icon: Icon,
    title,
    children,
}: {
    icon: typeof Mail;
    title: string;
    children: ReactNode;
}) {
    return (
        <div className="flex gap-4">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-brand-soft/25 text-brand">
                <Icon className="size-5" />
            </span>
            <div className="min-w-0">
                <p className="font-display font-semibold text-brand">{title}</p>
                <div className="break-words whitespace-pre-line">
                    {children}
                </div>
            </div>
        </div>
    );
}

function ContactDetailsCard({ details }: { details: ContactDetails }) {
    const socials = [
        { label: 'Facebook', url: details.facebook_url },
        { label: 'Instagram', url: details.instagram_url },
        { label: 'TikTok', url: details.tiktok_url },
        { label: 'YouTube', url: details.youtube_url },
    ].filter((social) => social.url);

    return (
        <aside className="space-y-6 border-y-[2.4px] border-brand-soft bg-[#f3f5fa] p-6 sm:p-8">
            {details.contact_email && (
                <DetailRow icon={Mail} title="Correo">
                    <a
                        href={`mailto:${details.contact_email}`}
                        className="text-brand hover:underline"
                    >
                        {details.contact_email}
                    </a>
                </DetailRow>
            )}
            {details.contact_phones && (
                <DetailRow icon={Phone} title="Teléfonos">
                    {details.contact_phones}
                </DetailRow>
            )}
            {details.contact_hours && (
                <DetailRow icon={Clock} title="Horario">
                    {details.contact_hours}
                </DetailRow>
            )}
            {details.contact_address && (
                <DetailRow icon={MapPin} title="Oficina">
                    {details.contact_address}
                    {details.map_url && (
                        <a
                            href={details.map_url}
                            target="_blank"
                            rel="noreferrer"
                            className="mt-1 block font-semibold text-brand hover:underline"
                        >
                            Ver en el mapa
                        </a>
                    )}
                </DetailRow>
            )}
            {socials.length > 0 && (
                <div>
                    <p className="font-display font-semibold text-brand">
                        Redes sociales
                    </p>
                    <ul className="mt-3 flex flex-wrap gap-2">
                        {socials.map((social) => (
                            <li key={social.label}>
                                <a
                                    href={social.url ?? undefined}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="inline-block rounded-full border-[1.6px] border-brand-soft px-4 py-1.5 text-sm font-medium text-brand transition-colors hover:bg-brand-soft hover:text-white"
                                >
                                    {social.label}
                                </a>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </aside>
    );
}

export default function Contact({
    text,
    details,
}: {
    text: string;
    details: ContactDetails;
}) {
    const hasDetails = Object.values(details).some(Boolean);

    return (
        <PublicLayout>
            <Head title="Contacto">
                <meta
                    name="description"
                    content="Contacta a la Federación de Globos Aerostáticos Teotihuacán."
                />
            </Head>

            <main className="px-6 py-16">
                <SectionTitle title="Contacto">{text}</SectionTitle>

                <div
                    className={cn(
                        'mx-auto mt-10 grid max-w-6xl gap-8',
                        hasDetails && 'lg:grid-cols-[1fr_2fr]',
                    )}
                >
                    {hasDetails && <ContactDetailsCard details={details} />}

                    <Form
                        {...sendContact.form()}
                        resetOnSuccess
                        options={{ preserveScroll: true }}
                        className="border-y-[2.4px] border-brand-soft bg-white p-6 shadow-[0_0_24px_rgba(0,0,0,0.12)] sm:p-8"
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
                </div>
            </main>
        </PublicLayout>
    );
}
