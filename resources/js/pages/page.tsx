import { Head, Link } from '@inertiajs/react';
import PageBlocks from '@/components/site/page-blocks';
import type { PageData } from '@/components/site/page-blocks';
import PublicLayout from '@/layouts/public-layout';
import type { PageContent } from '@/types/site';

type Props = PageData & {
    page: { id: number; title: string; url: string; is_home: boolean };
    content: PageContent;
    isPreview: boolean;
};

export default function Page({ page, content, isPreview, ...data }: Props) {
    const seo = content.seo;
    const title = seo.meta_title || (page.is_home ? 'Federación de Globos Aerostáticos Teotihuacán' : page.title);

    return (
        <PublicLayout transparentHero={page.is_home}>
            <Head title={title}>
                {seo.meta_description && <meta name="description" content={seo.meta_description} />}
                <meta property="og:title" content={seo.og_title || title} />
                {(seo.og_description || seo.meta_description) && (
                    <meta property="og:description" content={seo.og_description || seo.meta_description} />
                )}
                {seo.og_image && <meta property="og:image" content={seo.og_image} />}
                {isPreview && <meta name="robots" content="noindex" />}
            </Head>

            {isPreview && (
                <div className="sticky top-0 z-50 flex items-center justify-between gap-3 bg-amber-500 px-4 py-2 text-sm font-semibold text-white">
                    Vista previa · cambios sin guardar
                    <Link href={`/admin/paginas/${page.id}/editar`} className="underline">
                        Volver al editor
                    </Link>
                </div>
            )}

            <main>
                {content.blocks.length > 0 ? (
                    <PageBlocks blocks={content.blocks} theme={content.theme} data={data} />
                ) : (
                    <section className="px-6 py-24 text-center">
                        <h1 className="font-display text-4xl font-bold text-brand uppercase">{page.title}</h1>
                    </section>
                )}
            </main>
        </PublicLayout>
    );
}
