import { Head, Link } from '@inertiajs/react';
import { pill } from '@/components/public/buttons';
import CompanyLogos from '@/components/public/company-logos';
import type { Company } from '@/components/public/company-logos';
import InfoSection from '@/components/public/info-section';
import type { InfoSectionData } from '@/components/public/info-section';
import SectionTitle from '@/components/public/section-title';
import PublicLayout from '@/layouts/public-layout';
import { cn } from '@/lib/utils';
import { home } from '@/routes';
import { show as contact } from '@/routes/contact';

type SitePage = {
    slug: 'nosotros' | 'proyectos' | 'transparencia' | 'donar';
    title: string;
    description: string;
};

export default function Page({
    page,
    sections,
    companies,
}: {
    page: SitePage;
    sections: InfoSectionData[];
    companies: Company[];
}) {
    return (
        <PublicLayout>
            <Head title={page.title}>
                <meta name="description" content={page.description} />
            </Head>

            <section className="bg-brand px-6 py-14 text-center text-white">
                <h1 className="font-display text-4xl font-bold uppercase sm:text-5xl">
                    {page.title}
                </h1>
                <p className="mx-auto mt-4 max-w-2xl text-lg text-white/85">
                    {page.description}
                </p>
            </section>

            <main>
                {sections.map((section, index) => (
                    <InfoSection
                        key={section.id}
                        section={section}
                        index={index}
                    />
                ))}

                {sections.length === 0 && (
                    <section className="px-6 py-20 text-center">
                        <p className="text-lg text-neutral-500">
                            Estamos preparando esta información.
                        </p>
                        <Link
                            href={contact()}
                            className={cn(pill, 'mt-6')}
                        >
                            Contáctanos
                        </Link>
                    </section>
                )}

                {page.slug === 'proyectos' && (
                    <section className="px-6 py-16 text-center">
                        <SectionTitle title="Semáforo de operación">
                            Las empresas asociadas evalúan cada jornada si las
                            condiciones permiten volar sobre la zona de las
                            Pirámides.
                        </SectionTitle>
                        <Link
                            href={`${home.url()}#semaforo`}
                            className={cn(pill, 'mt-8')}
                        >
                            Ver el semáforo de hoy
                        </Link>
                    </section>
                )}

                {companies.length > 0 && (
                    <section
                        id="asociados"
                        className={cn(
                            'scroll-mt-28 px-6 py-16',
                            sections.length % 2 === 0 && 'bg-[#f3f5fa]',
                        )}
                    >
                        <SectionTitle title="Asociados">
                            Empresas que integran la federación.
                        </SectionTitle>
                        <div className="mt-6">
                            <CompanyLogos companies={companies} />
                        </div>
                    </section>
                )}
            </main>
        </PublicLayout>
    );
}
