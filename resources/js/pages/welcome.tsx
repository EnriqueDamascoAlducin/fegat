import { Deferred, Head, Link, usePoll } from '@inertiajs/react';
import { pill, pillOutline } from '@/components/public/buttons';
import CompanyLogos from '@/components/public/company-logos';
import type { Company } from '@/components/public/company-logos';
import InfoSection from '@/components/public/info-section';
import type { InfoSectionData } from '@/components/public/info-section';
import PostCard from '@/components/public/post-card';
import type { PostSummary } from '@/components/public/post-card';
import SectionTitle from '@/components/public/section-title';
import SemaphoreCard from '@/components/semaphore-card';
import WeatherCard, { WeatherCardSkeleton } from '@/components/weather-card';
import PublicLayout from '@/layouts/public-layout';
import { describeSemaphore } from '@/lib/semaphore';
import { cn } from '@/lib/utils';
import { page } from '@/routes';
import { index as blogIndex } from '@/routes/blog';
import { show as contact } from '@/routes/contact';
import type { SemaphoreData, SemaphoreStatus, WeatherData } from '@/types';

const STATUS_DOT: Record<SemaphoreStatus, string> = {
    green: 'bg-emerald-400',
    yellow: 'bg-amber-300',
    red: 'bg-red-400',
    waiting: 'animate-pulse bg-white/60',
    not_open: 'bg-white/60',
};

type HomeContent = {
    hero_title: string;
    hero_text: string | null;
    semaphore_text: string;
    contact_text: string;
};

export default function Welcome({
    semaphore,
    content,
    sections,
    posts,
    companies,
    heroImage,
    weather,
}: {
    semaphore: SemaphoreData | null;
    /** Prop diferida: llega después de pintar la página. */
    weather?: WeatherData | null;
    content: HomeContent;
    sections: InfoSectionData[];
    posts: PostSummary[];
    companies: Company[];
    heroImage: string | null;
}) {
    usePoll(15000, { only: ['semaphore'] });

    return (
        <>
            <Head title="Federación de Globos Aerostáticos Teotihuacán" />

            <PublicLayout>
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
                                <Link href={page('nosotros')} className={pill}>
                                    Quiénes somos
                                </Link>
                                <Link
                                    href={page('donar')}
                                    className={pillOutline}
                                >
                                    Donar
                                </Link>
                                <Link href={contact()} className={pillOutline}>
                                    Contacto
                                </Link>
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

                    <section
                        id="clima"
                        className={cn(
                            'scroll-mt-28 px-6 py-16',
                            semaphore && 'pt-0',
                        )}
                    >
                        <SectionTitle title="Clima en Teotihuacán">
                            Condiciones actuales y pronóstico por hora para la
                            mañana de vuelo.
                        </SectionTitle>

                        <Deferred
                            data="weather"
                            fallback={
                                <WeatherCardSkeleton
                                    tone="light"
                                    className="mx-auto mt-10 max-w-4xl"
                                />
                            }
                        >
                            <WeatherCard
                                weather={weather ?? null}
                                tone="light"
                                className="mx-auto mt-10 max-w-4xl shadow-[0_0_30px_rgba(0,0,0,0.15)]"
                            />
                        </Deferred>
                    </section>

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

                    {companies.length > 0 && (
                        <section
                            id="empresas"
                            className="scroll-mt-28 bg-[#f3f5fa] px-6 py-6"
                        >
                            <h2 className="sr-only">Empresas asociadas</h2>
                            <CompanyLogos companies={companies} />
                        </section>
                    )}

                    <section
                        id="contacto"
                        className="bg-brand px-6 py-14 text-center text-white"
                    >
                        <h2 className="font-display text-[32px] leading-tight font-bold uppercase">
                            Contacto
                        </h2>
                        <p className="mx-auto mt-4 max-w-2xl text-lg text-white/85">
                            {content.contact_text}
                        </p>
                        <Link href={contact()} className={cn(pill, 'mt-7')}>
                            Escríbenos
                        </Link>
                    </section>
                </main>
            </PublicLayout>
        </>
    );
}
