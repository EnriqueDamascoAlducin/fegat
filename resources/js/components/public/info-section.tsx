import SectionTitle from '@/components/public/section-title';
import { cn } from '@/lib/utils';

export type InfoSectionData = {
    id: number;
    title: string;
    body: string;
    image_url: string | null;
};

/**
 * Sección de texto con formato que el super admin arma desde «Sitio público».
 * Alterna el fondo y el lado de la imagen según su lugar en la página.
 */
export default function InfoSection({
    section,
    index,
}: {
    section: InfoSectionData;
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
