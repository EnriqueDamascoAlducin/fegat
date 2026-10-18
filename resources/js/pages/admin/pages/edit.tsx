import { Head, Link, router } from '@inertiajs/react';
import { ArrowLeft, Eye, Save } from 'lucide-react';
import { useEffect, useState } from 'react';
import PageEditor from '@/components/site/page-editor';
import type { EditorPage } from '@/components/site/page-editor';
import { Button } from '@/components/ui/button';
import { index, preview, update } from '@/routes/admin/pages';
import type { NavOptions, PageContent } from '@/types/site';

type Props = {
    page: EditorPage & { id: number; url: string; content: PageContent };
    navOptions: NavOptions;
};

function csrfToken(): string {
    const match = document.cookie.match(/(?:^|; )XSRF-TOKEN=([^;]+)/);

    return match ? decodeURIComponent(match[1]) : '';
}

export default function EditPage({ page, navOptions }: Props) {
    const [data, setData] = useState<EditorPage>({ title: page.title, slug: page.slug, is_active: page.is_active, is_home: page.is_home });
    const [content, setContent] = useState<PageContent>(page.content);
    const [errors, setErrors] = useState<Record<string, string | undefined>>({});
    const [saving, setSaving] = useState(false);
    const [previewing, setPreviewing] = useState(false);
    const [dirty, setDirty] = useState(false);

    useEffect(() => {
        if (!dirty) {
            return;
        }

        const warn = (event: BeforeUnloadEvent) => event.preventDefault();
        window.addEventListener('beforeunload', warn);

        return () => window.removeEventListener('beforeunload', warn);
    }, [dirty]);

    const payload = () => ({ ...data, content });

    const save = () => {
        setSaving(true);
        router.put(update.url(page.id), payload(), {
            preserveScroll: true,
            preserveState: true,
            onSuccess: () => {
                setErrors({});
                setDirty(false);
            },
            onError: (bag) => setErrors(bag),
            onFinish: () => setSaving(false),
        });
    };

    const openPreview = async () => {
        // Se abre antes del fetch: si se abre después, el navegador lo bloquea como popup.
        const tab = window.open('about:blank', '_blank');
        setPreviewing(true);

        try {
            const response = await fetch(preview.url(page.id), {
                method: 'POST',
                headers: { Accept: 'application/json', 'Content-Type': 'application/json', 'X-XSRF-TOKEN': csrfToken() },
                body: JSON.stringify(payload()),
            });
            const body = await response.json();

            if (!response.ok) {
                tab?.close();
                setErrors(Object.fromEntries(Object.entries(body.errors ?? {}).map(([key, value]) => [key, (value as string[])[0]])));

                return;
            }

            if (tab) {
                tab.location.href = body.url;
            }
        } catch {
            tab?.close();
            window.alert('No se pudo generar la vista previa.');
        } finally {
            setPreviewing(false);
        }
    };

    const contentErrors = Object.entries(errors).filter(([key]) => key.startsWith('content'));

    return (
        <>
            <Head title={`Editar · ${page.title}`} />

            <div className="space-y-5 p-4">
                <div className="flex flex-wrap items-center gap-3">
                    <Button variant="ghost" size="sm" asChild>
                        <Link href={index()}>
                            <ArrowLeft className="size-4" /> Páginas
                        </Link>
                    </Button>
                    <div className="min-w-0 flex-1">
                        <h1 className="truncate text-lg font-semibold">{data.title || 'Sin nombre'}</h1>
                        <p className="font-mono text-xs text-muted-foreground">{data.is_home ? '/' : `/${data.slug}`}</p>
                    </div>
                    {dirty && <span className="text-xs font-semibold text-amber-600">Cambios sin guardar</span>}
                    <Button variant="outline" onClick={() => void openPreview()} disabled={previewing}>
                        <Eye className="size-4" /> {previewing ? 'Generando…' : 'Vista previa'}
                    </Button>
                    <Button onClick={save} disabled={saving}>
                        <Save className="size-4" /> {saving ? 'Guardando…' : 'Guardar'}
                    </Button>
                </div>

                {contentErrors.length > 0 && (
                    <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                        {contentErrors.map(([key, message]) => (
                            <p key={key}>{message}</p>
                        ))}
                    </div>
                )}

                <PageEditor
                    page={data}
                    content={content}
                    navOptions={navOptions}
                    errors={errors}
                    onPageChange={(patch) => {
                        setData((current) => ({ ...current, ...patch }));
                        setDirty(true);
                    }}
                    onContentChange={(next) => {
                        setContent(next);
                        setDirty(true);
                    }}
                />
            </div>
        </>
    );
}

EditPage.layout = {
    breadcrumbs: [{ title: 'Páginas', href: index() }],
};
