import { Head, Link, router } from '@inertiajs/react';
import { Activity, Eye, Info, Loader2, MousePointerClick, Timer, TriangleAlert, Users } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import { DEVICES, chartTooltip } from '@/lib/visitors';
import { index as liveIndex, report } from '@/routes/admin/visitors';
import { visits as visitsRoute } from '@/routes/admin/visitors/report';

type Metrics = { visits: number; pages_per_visit: number; avg_duration: number; bounce_rate: number };

// `value` es el valor crudo con el que se agrupó, cuando `name` se relabeló.
type Row = Metrics & { name: string; detail?: string | null; value?: string; source?: string | null; medium?: string | null };

type PageRow = { name: string; title: string | null; views: number; visitors: number };

type Dimension = 'devices' | 'systems' | 'browsers' | 'screens' | 'in_app' | 'sources' | 'campaigns' | 'untagged_clicks' | 'landings' | 'countries' | 'pages';

type Selection = { dimension: Dimension; title: string; label: string; value: string; source?: string | null; medium?: string | null };

type VisitDetail = {
    id: number;
    started_at: string | null;
    duration: number;
    device: string | null;
    os: string | null;
    browser: string | null;
    country: string | null;
    source: string | null;
    page_views: number;
    landing_path: string | null;
    exit_path: string | null;
    pages: Array<{ path: string; title: string | null; viewed_at: string }>;
};

type Props = {
    filters: { from: string; to: string };
    summary: Metrics & { visitors: number };
    daily: Array<{ day: string; visits: number; page_views: number }>;
    hours: Array<{ hour: number; visits: number }>;
    pages: PageRow[];
    devices: Row[];
    systems: Row[];
    browsers: Row[];
    screens: Row[];
    in_app: Row[];
    sources: Row[];
    campaigns: Row[];
    untagged_clicks: Row[];
    landings: Row[];
    countries: Row[];
    insights: Array<{ tone: 'info' | 'warning'; title: string; text: string }>;
    first_visit_at: string | null;
};

const PRESETS = [
    { days: 7, label: '7 días' },
    { days: 30, label: '30 días' },
    { days: 90, label: '90 días' },
];

const TABS = [
    { key: 'pages', label: 'Páginas visitadas' },
    { key: 'devices', label: 'Dispositivos' },
    { key: 'campaigns', label: 'Campañas y fuentes' },
    { key: 'landings', label: 'Páginas de entrada' },
    { key: 'audience', label: 'Audiencia y horarios' },
] as const;

type TabKey = (typeof TABS)[number]['key'];

const CLICKS: Record<string, string> = { google: 'Google Ads', meta: 'Meta (Facebook / Instagram)', tiktok: 'TikTok', microsoft: 'Microsoft Ads' };

const quantity = (value: number) => new Intl.NumberFormat('es-MX', { maximumFractionDigits: 0 }).format(Number(value || 0));
const decimal = (value: number) => new Intl.NumberFormat('es-MX', { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(Number(value || 0));
const percent = (value: number) => `${decimal(value)}%`;

const duration = (seconds: number) => {
    if (seconds < 60) {
        return `${seconds} s`;
    }

    const minutes = Math.floor(seconds / 60);

    return minutes < 60 ? `${minutes} min ${seconds % 60} s` : `${Math.floor(minutes / 60)} h ${minutes % 60} min`;
};

// Fecha local en formato Y-m-d (toISOString la movería a UTC).
const isoDate = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

const relabel = (rows: Row[], labels: Record<string, string>) => rows.map((row) => ({ ...row, value: row.name, name: labels[row.name] ?? row.name }));

function Panel({ title, hint, children, className }: { title: string; hint?: string; children: ReactNode; className?: string }) {
    return (
        <section className={cn('overflow-hidden rounded-xl border bg-card', className)}>
            <div className="border-b px-4 py-3">
                <h2 className="font-semibold">{title}</h2>
                {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
            </div>
            {children}
        </section>
    );
}

function MetricTable({
    dimension,
    onOpen,
    title,
    hint,
    rows,
    total,
    empty = 'Sin visitas en este periodo.',
}: {
    dimension: Dimension;
    onOpen: (selection: Selection) => void;
    title: string;
    hint?: string;
    rows: Row[];
    total: number;
    empty?: string;
}) {
    return (
        <Panel title={title} hint={hint}>
            <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                    <thead className="bg-muted/40 text-xs text-muted-foreground">
                        <tr>
                            <th className="px-4 py-2.5 text-left font-medium">{title}</th>
                            <th className="px-3 py-2.5 text-right font-medium">Visitas</th>
                            <th className="px-3 py-2.5 text-right font-medium">Págs.</th>
                            <th className="px-3 py-2.5 text-right font-medium">Duración</th>
                            <th className="px-4 py-2.5 text-right font-medium">Rebote</th>
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map((row) => {
                            const share = total > 0 ? (row.visits / total) * 100 : 0;

                            return (
                                <tr
                                    key={`${row.name}|${row.detail ?? ''}`}
                                    onClick={() => onOpen({ dimension, title, label: row.name, value: row.value ?? row.name, source: row.source, medium: row.medium })}
                                    title="Ver las visitas y qué páginas vieron"
                                    className="cursor-pointer border-t transition hover:bg-muted/30"
                                >
                                    <td className="max-w-xs px-4 py-2.5">
                                        <p className="truncate font-medium" title={row.name}>
                                            {row.name}
                                        </p>
                                        {row.detail && <p className="truncate text-xs text-muted-foreground">{row.detail}</p>}
                                        <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-muted">
                                            <div className="h-full rounded-full bg-brand" style={{ width: `${Math.round(share)}%` }} />
                                        </div>
                                    </td>
                                    <td className="px-3 py-2.5 text-right tabular-nums">
                                        <span className="font-semibold">{quantity(row.visits)}</span>
                                        <span className="ml-1.5 text-xs text-muted-foreground">{percent(share)}</span>
                                    </td>
                                    <td className="px-3 py-2.5 text-right tabular-nums">{decimal(row.pages_per_visit)}</td>
                                    <td className="px-3 py-2.5 text-right whitespace-nowrap tabular-nums">{duration(row.avg_duration)}</td>
                                    <td className="px-4 py-2.5 text-right tabular-nums">{percent(row.bounce_rate)}</td>
                                </tr>
                            );
                        })}
                        {rows.length === 0 && (
                            <tr>
                                <td colSpan={5} className="px-4 py-10 text-center text-muted-foreground">
                                    {empty}
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </Panel>
    );
}

function PagesTable({ rows, onOpen }: { rows: PageRow[]; onOpen: (selection: Selection) => void }) {
    const max = Math.max(1, ...rows.map((row) => row.views));

    return (
        <Panel title="Páginas más vistas" hint="Cada vez que alguien abrió la página, y cuántos visitantes distintos lo hicieron.">
            <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                    <thead className="bg-muted/40 text-xs text-muted-foreground">
                        <tr>
                            <th className="px-4 py-2.5 text-left font-medium">Página</th>
                            <th className="px-3 py-2.5 text-right font-medium">Vistas</th>
                            <th className="px-4 py-2.5 text-right font-medium">Visitantes</th>
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map((row) => (
                            <tr
                                key={row.name}
                                onClick={() => onOpen({ dimension: 'pages', title: 'Página', label: row.title || row.name, value: row.name })}
                                title="Ver las visitas que pasaron por esta página"
                                className="cursor-pointer border-t transition hover:bg-muted/30"
                            >
                                <td className="max-w-md px-4 py-2.5">
                                    <p className="truncate font-medium">{row.title || row.name}</p>
                                    <p className="truncate font-mono text-xs text-muted-foreground">{row.name}</p>
                                    <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-muted">
                                        <div className="h-full rounded-full bg-brand" style={{ width: `${Math.round((row.views / max) * 100)}%` }} />
                                    </div>
                                </td>
                                <td className="px-3 py-2.5 text-right font-semibold tabular-nums">{quantity(row.views)}</td>
                                <td className="px-4 py-2.5 text-right tabular-nums">{quantity(row.visitors)}</td>
                            </tr>
                        ))}
                        {rows.length === 0 && (
                            <tr>
                                <td colSpan={3} className="px-4 py-10 text-center text-muted-foreground">
                                    Sin páginas vistas en este periodo.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </Panel>
    );
}

const dateTime = (value: string | null) => (value ? new Date(value).toLocaleString('es-MX', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '');
const clock = (value: string) => new Date(value).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

type VisitsState = { loading: boolean; error: boolean; total: number; visits: VisitDetail[] };

/** Panel con las visitas de un renglón y las páginas que vio cada una, en orden. */
function VisitsSheet({ selection, filters, onClose }: { selection: Selection | null; filters: Props['filters']; onClose: () => void }) {
    const [state, setState] = useState<VisitsState>({ loading: false, error: false, total: 0, visits: [] });

    useEffect(() => {
        if (!selection) {
            return;
        }

        const query: Record<string, string> = { ...filters, dimension: selection.dimension, value: selection.value };

        if (selection.dimension === 'campaigns') {
            if (selection.source) {
                query.source = selection.source;
            }

            if (selection.medium) {
                query.medium = selection.medium;
            }
        }

        const controller = new AbortController();
        setState({ loading: true, error: false, total: 0, visits: [] });

        fetch(visitsRoute.url({ query }), {
            headers: { Accept: 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
            credentials: 'same-origin',
            signal: controller.signal,
        })
            .then((response) => {
                if (!response.ok) {
                    throw new Error(String(response.status));
                }

                return response.json();
            })
            .then((data: { total: number; visits: VisitDetail[] }) => setState({ loading: false, error: false, ...data }))
            .catch((error) => {
                if (error?.name !== 'AbortError') {
                    setState({ loading: false, error: true, total: 0, visits: [] });
                }
            });

        return () => controller.abort();
    }, [selection, filters]);

    return (
        <Sheet open={selection !== null} onOpenChange={(open) => !open && onClose()}>
            <SheetContent side="right" className="w-full gap-0 overflow-y-auto sm:max-w-xl">
                <SheetHeader className="border-b pr-10">
                    <SheetTitle>
                        {selection?.title}: {selection?.label}
                    </SheetTitle>
                    <SheetDescription>
                        {state.loading
                            ? 'Cargando visitas…'
                            : state.total > state.visits.length
                              ? `Las ${quantity(state.visits.length)} visitas más recientes de ${quantity(state.total)}.`
                              : `${quantity(state.total)} ${state.total === 1 ? 'visita' : 'visitas'} en el periodo.`}
                    </SheetDescription>
                </SheetHeader>

                {state.loading && (
                    <div className="flex justify-center p-10 text-muted-foreground">
                        <Loader2 className="size-5 animate-spin" />
                    </div>
                )}

                {state.error && <p className="p-4 text-sm text-destructive">No se pudieron cargar las visitas.</p>}

                <ul className="divide-y">
                    {state.visits.map((visit) => (
                        <li key={visit.id} className="p-4">
                            <div className="flex flex-wrap items-baseline justify-between gap-2">
                                <p className="text-sm font-semibold">{dateTime(visit.started_at)}</p>
                                <p className="text-xs text-muted-foreground tabular-nums">
                                    {quantity(visit.page_views)} {visit.page_views === 1 ? 'página' : 'páginas'} · {duration(visit.duration)}
                                </p>
                            </div>
                            <p className="mt-0.5 text-xs text-muted-foreground">
                                {[DEVICES[visit.device ?? ''] ?? visit.device, visit.os, visit.browser, visit.country, visit.source].filter(Boolean).join(' · ')}
                            </p>

                            {visit.pages.length > 0 ? (
                                <ol className="mt-3 space-y-1.5 border-l pl-4">
                                    {visit.pages.map((page, index) => (
                                        <li key={`${page.viewed_at}-${index}`} className="relative">
                                            <span className="absolute top-1.5 -left-[21px] size-2 rounded-full bg-brand" />
                                            <p className="truncate text-sm font-medium" title={page.path}>
                                                {page.path}
                                            </p>
                                            <p className="truncate text-xs text-muted-foreground">
                                                {clock(page.viewed_at)}
                                                {page.title ? ` · ${page.title}` : ''}
                                            </p>
                                        </li>
                                    ))}
                                </ol>
                            ) : (
                                <p className="mt-3 rounded-md bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
                                    Entró por <span className="font-medium text-foreground">{visit.landing_path ?? '/'}</span>
                                    {visit.exit_path && visit.exit_path !== visit.landing_path && (
                                        <>
                                            {' '}
                                            y salió en <span className="font-medium text-foreground">{visit.exit_path}</span>
                                        </>
                                    )}
                                    .
                                </p>
                            )}
                        </li>
                    ))}
                </ul>
            </SheetContent>
        </Sheet>
    );
}

export default function VisitorReport(props: Props) {
    const { filters, summary, daily, hours, insights } = props;
    const [tab, setTab] = useState<TabKey>('pages');
    const [from, setFrom] = useState(filters.from);
    const [to, setTo] = useState(filters.to);
    const [selected, setSelected] = useState<Selection | null>(null);

    const apply = (range: { from: string; to: string }) => {
        setFrom(range.from);
        setTo(range.to);
        router.get(report.url(), range, { preserveState: true, preserveScroll: true, replace: true });
    };

    const applyPreset = (days: number) => {
        const end = new Date();
        const start = new Date();
        start.setDate(end.getDate() - (days - 1));
        apply({ from: isoDate(start), to: isoDate(end) });
    };

    const dailyData = daily.map((row) => ({
        ...row,
        label: new Date(`${row.day}T00:00:00`).toLocaleDateString('es-MX', { day: '2-digit', month: 'short' }),
    }));
    const hourData = hours.map((row) => ({ ...row, label: `${String(row.hour).padStart(2, '0')}:00` }));
    const totalViews = props.pages.reduce((sum, row) => sum + row.views, 0);

    const stats = [
        { label: 'Visitas', value: quantity(summary.visits), hint: `${quantity(summary.visitors)} navegadores distintos`, icon: Activity },
        { label: 'Páginas vistas', value: quantity(daily.reduce((sum, row) => sum + row.page_views, 0)), hint: `${quantity(props.pages.length)} páginas distintas`, icon: Eye },
        { label: 'Páginas por visita', value: decimal(summary.pages_per_visit), hint: `${percent(summary.bounce_rate)} ve una sola página`, icon: MousePointerClick },
        { label: 'Duración promedio', value: duration(summary.avg_duration), hint: 'Desde la primera hasta la última señal', icon: Timer },
    ];

    return (
        <>
            <Head title="Reporte de visitantes" />

            <div className="flex w-full max-w-7xl flex-col gap-6 p-4">
                <header className="flex flex-col gap-4 border-b pb-6 lg:flex-row lg:items-end lg:justify-between">
                    <div>
                        <h1 className="text-xl font-semibold tracking-tight">Reporte de visitantes</h1>
                        <p className="mt-1 text-sm text-muted-foreground">
                            Qué páginas se visitan, desde qué dispositivos y de dónde llega la gente. No incluye a quien tiene sesión iniciada ni a los bots.
                        </p>
                        <Link href={liveIndex()} className="mt-2 inline-flex items-center gap-1.5 text-sm font-medium text-brand hover:underline">
                            <Users className="size-4" />
                            Ver visitantes en vivo
                        </Link>
                    </div>
                    <form
                        className="flex flex-wrap items-end gap-2"
                        onSubmit={(event) => {
                            event.preventDefault();
                            apply({ from, to });
                        }}
                    >
                        <div className="flex gap-1">
                            {PRESETS.map((preset) => (
                                <button
                                    key={preset.days}
                                    type="button"
                                    onClick={() => applyPreset(preset.days)}
                                    className="rounded-md px-3 py-2 text-xs font-medium text-muted-foreground transition hover:bg-muted"
                                >
                                    {preset.label}
                                </button>
                            ))}
                        </div>
                        <label className="text-xs text-muted-foreground">
                            Desde
                            <input type="date" value={from} max={to} onChange={(event) => setFrom(event.target.value)} className="mt-1 block rounded-md border bg-background px-2 py-1.5 text-sm text-foreground" />
                        </label>
                        <label className="text-xs text-muted-foreground">
                            Hasta
                            <input type="date" value={to} min={from} onChange={(event) => setTo(event.target.value)} className="mt-1 block rounded-md border bg-background px-2 py-1.5 text-sm text-foreground" />
                        </label>
                        <button type="submit" className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:opacity-90">
                            Aplicar
                        </button>
                    </form>
                </header>

                {summary.visits === 0 && (
                    <div className="rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                        No hay visitas registradas en este periodo.{' '}
                        {props.first_visit_at
                            ? `El histórico empieza el ${new Date(props.first_visit_at.replace(' ', 'T')).toLocaleDateString('es-MX', { day: '2-digit', month: 'long', year: 'numeric' })}.`
                            : 'El histórico se llena desde que se activó este reporte; las visitas aparecen a los pocos minutos (cada corrida del comando programado).'}
                    </div>
                )}

                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    {stats.map((item) => (
                        <div key={item.label} className="flex items-start justify-between rounded-xl border bg-card p-4">
                            <div>
                                <p className="text-sm text-muted-foreground">{item.label}</p>
                                <p className="mt-1 text-2xl font-bold tracking-tight tabular-nums">{item.value}</p>
                                <p className="mt-1 text-xs text-muted-foreground">{item.hint}</p>
                            </div>
                            <item.icon className="size-5 text-muted-foreground" />
                        </div>
                    ))}
                </div>

                {insights.length > 0 && (
                    <Panel title="Qué atender primero" hint="Lecturas automáticas del periodo seleccionado.">
                        <ul className="grid gap-px bg-border md:grid-cols-2">
                            {insights.map((insight) => (
                                <li key={insight.title} className="flex gap-3 bg-card p-4">
                                    {insight.tone === 'warning' ? (
                                        <TriangleAlert className="mt-0.5 size-5 shrink-0 text-amber-500" />
                                    ) : (
                                        <Info className="mt-0.5 size-5 shrink-0 text-brand" />
                                    )}
                                    <div>
                                        <p className="text-sm font-semibold">{insight.title}</p>
                                        <p className="mt-1 text-sm text-muted-foreground">{insight.text}</p>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    </Panel>
                )}

                <Panel title="Visitas por día" hint="Visitas iniciadas y páginas que vieron.">
                    <div className="h-[280px] p-4">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={dailyData} margin={{ top: 10, right: 20, left: 0, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.15} stroke="#6c0ea3" />
                                <XAxis dataKey="label" tick={{ fontSize: 11 }} stroke="#9CA3AF" minTickGap={30} />
                                <YAxis stroke="#9CA3AF" width={40} allowDecimals={false} />
                                <Tooltip formatter={(value: unknown, name: unknown) => [quantity(Number(value || 0)), String(name)]} {...chartTooltip} />
                                <Area type="monotone" dataKey="page_views" name="Páginas vistas" stroke="#c699e1" fill="#c699e1" fillOpacity={0.2} strokeWidth={2} />
                                <Area type="monotone" dataKey="visits" name="Visitas" stroke="#6c0ea3" fill="#6c0ea3" fillOpacity={0.15} strokeWidth={2} />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </Panel>

                <div role="tablist" className="flex flex-wrap gap-1 border-b">
                    {TABS.map((item) => (
                        <button
                            key={item.key}
                            type="button"
                            role="tab"
                            aria-selected={tab === item.key}
                            onClick={() => setTab(item.key)}
                            className={cn(
                                '-mb-px border-b-2 px-4 py-2 text-sm font-medium transition',
                                tab === item.key ? 'border-brand text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground',
                            )}
                        >
                            {item.label}
                        </button>
                    ))}
                </div>

                {tab === 'pages' && (
                    <>
                        <p className="text-sm text-muted-foreground">{quantity(totalViews)} vistas en las 30 páginas más visitadas del periodo.</p>
                        <PagesTable rows={props.pages} onOpen={setSelected} />
                    </>
                )}

                {tab === 'devices' && (
                    <div className="grid gap-4 xl:grid-cols-2">
                        <MetricTable dimension="devices" onOpen={setSelected} title="Tipo de dispositivo" rows={relabel(props.devices, DEVICES)} total={summary.visits} />
                        <MetricTable dimension="systems" onOpen={setSelected} title="Sistema operativo" rows={props.systems} total={summary.visits} />
                        <MetricTable
                            dimension="screens"
                            onOpen={setSelected}
                            title="Ancho de pantalla"
                            hint="Ancho de la ventana del navegador, que es lo que decide el diseño que ve el visitante."
                            rows={props.screens}
                            total={summary.visits}
                        />
                        <MetricTable dimension="browsers" onOpen={setSelected} title="Navegador" rows={props.browsers} total={summary.visits} />
                        <MetricTable
                            dimension="in_app"
                            onOpen={setSelected}
                            title="Navegador dentro de una app"
                            hint="Visitas que abren el sitio sin salir de Instagram, Facebook, TikTok, etc."
                            rows={props.in_app}
                            total={summary.visits}
                        />
                    </div>
                )}

                {tab === 'campaigns' && (
                    <div className="grid gap-4">
                        <MetricTable
                            dimension="campaigns"
                            onOpen={setSelected}
                            title="Campañas"
                            hint="Visitas que llegaron con utm_campaign en el enlace."
                            rows={props.campaigns}
                            total={summary.visits}
                            empty="Ninguna visita llegó con utm_campaign en este periodo."
                        />
                        <div className="grid gap-4 xl:grid-cols-2">
                            <MetricTable
                                dimension="sources"
                                onOpen={setSelected}
                                title="Fuentes"
                                hint="utm_source; si no hay, el sitio de donde vino; si tampoco, «Directo»."
                                rows={props.sources}
                                total={summary.visits}
                            />
                            <MetricTable
                                dimension="untagged_clicks"
                                onOpen={setSelected}
                                title="Clics de anuncio sin UTM"
                                hint="Traen el identificador de la plataforma (gclid, fbclid…) pero no dicen de qué campaña son. fbclid también lo llevan las publicaciones orgánicas."
                                rows={relabel(props.untagged_clicks, CLICKS)}
                                total={summary.visits}
                                empty="Sin clics de anuncio sin etiquetar."
                            />
                        </div>
                    </div>
                )}

                {tab === 'landings' && (
                    <MetricTable
                        dimension="landings"
                        onOpen={setSelected}
                        title="Páginas de entrada"
                        hint="La primera página que vio cada visita. Un rebote alto es gente que llegó ahí y se fue sin ver nada más."
                        rows={props.landings}
                        total={summary.visits}
                    />
                )}

                {tab === 'audience' && (
                    <div className="grid gap-4 xl:grid-cols-2">
                        <MetricTable dimension="countries" onOpen={setSelected} title="País" rows={props.countries} total={summary.visits} />
                        <Panel title="Hora del día" hint="A qué hora empiezan las visitas (hora del servidor).">
                            <div className="h-[260px] p-4">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={hourData} margin={{ top: 10, right: 20, left: 0, bottom: 5 }}>
                                        <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.15} stroke="#6c0ea3" />
                                        <XAxis dataKey="label" tick={{ fontSize: 11 }} stroke="#9CA3AF" />
                                        <YAxis stroke="#9CA3AF" width={40} allowDecimals={false} />
                                        <Tooltip formatter={(value: unknown) => [quantity(Number(value || 0)), 'Visitas']} {...chartTooltip} />
                                        <Bar dataKey="visits" fill="#6c0ea3" radius={[3, 3, 0, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </Panel>
                    </div>
                )}
            </div>

            <VisitsSheet selection={selected} filters={filters} onClose={() => setSelected(null)} />
        </>
    );
}

VisitorReport.layout = {
    breadcrumbs: [{ title: 'Reporte de visitantes', href: report() }],
};
