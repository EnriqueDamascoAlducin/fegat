import { Head, Link, router } from '@inertiajs/react';
import { Activity, ChartColumn, Globe2, Monitor, Smartphone, Tablet, TrendingUp, Users } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { DEVICES, chartTooltip } from '@/lib/visitors';
import { index, report } from '@/routes/admin/visitors';

type Breakdown = Array<{ name: string; total: number }>;

type Visitor = {
    id: number;
    label: string;
    country_code: string | null;
    device_type: string | null;
    path: string;
    page_title: string | null;
    landing_path: string | null;
    source: string;
    utm_campaign: string | null;
    page_views: number;
    first_seen_at: string | null;
    last_seen_at: string | null;
};

type Props = {
    live: {
        generated_at: string;
        total: number;
        today: number;
        peak_today: number;
        by_page: Breakdown;
        by_country: Breakdown;
        by_device: Breakdown;
        by_source: Breakdown;
        visitors: Visitor[];
    };
    history: Array<{ at: string; active: number; peak: number }>;
    filters: { hours: number };
    settings: { enabled: boolean; active_seconds: number };
};

const RANGES = [
    { hours: 24, label: '24 horas' },
    { hours: 72, label: '3 días' },
    { hours: 168, label: '7 días' },
    { hours: 720, label: '30 días' },
];

const quantity = (value: number) => new Intl.NumberFormat('es-MX', { maximumFractionDigits: 0 }).format(Number(value || 0));

const since = (from: string | null | undefined, to: number) => {
    if (!from) {
        return '—';
    }

    const seconds = Math.max(0, Math.round((to - new Date(from).getTime()) / 1000));

    if (seconds < 60) {
        return `${seconds} s`;
    }

    const minutes = Math.floor(seconds / 60);

    return minutes < 60 ? `${minutes} min` : `${Math.floor(minutes / 60)} h ${minutes % 60} min`;
};

const deviceIcon = (device: string | null) => {
    if (device === 'mobile') {
        return <Smartphone className="size-3.5" />;
    }

    return device === 'tablet' ? <Tablet className="size-3.5" /> : <Monitor className="size-3.5" />;
};

function BreakdownCard({ title, rows, total }: { title: string; rows: Breakdown; total: number }) {
    return (
        <div className="rounded-xl border bg-card p-4">
            <h2 className="text-sm font-semibold">{title}</h2>
            <ul className="mt-3 space-y-2.5">
                {rows.map((row) => (
                    <li key={row.name}>
                        <div className="flex items-center justify-between gap-3 text-sm">
                            <span className="truncate" title={row.name}>
                                {row.name}
                            </span>
                            <span className="font-semibold tabular-nums">{quantity(row.total)}</span>
                        </div>
                        <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted">
                            <div className="h-full rounded-full bg-brand" style={{ width: `${total > 0 ? Math.round((row.total / total) * 100) : 0}%` }} />
                        </div>
                    </li>
                ))}
                {rows.length === 0 && <li className="text-sm text-muted-foreground">Sin visitantes activos.</li>}
            </ul>
        </div>
    );
}

export default function LiveVisitors({ live, history, filters, settings }: Props) {
    // Reloj local para que «hace X s» avance entre un refresco y otro.
    const [now, setNow] = useState(() => Date.now());

    useEffect(() => {
        const poll = window.setInterval(() => {
            if (document.visibilityState === 'visible') {
                router.reload({ only: ['live'] });
            }
        }, 15000);
        const clock = window.setInterval(() => setNow(Date.now()), 1000);

        return () => {
            window.clearInterval(poll);
            window.clearInterval(clock);
        };
    }, []);

    const changeRange = (hours: number) => {
        router.get(index.url(), { hours }, { preserveState: true, preserveScroll: true, replace: true, only: ['history', 'filters'] });
    };

    const longRange = filters.hours > 72;
    const historyData = history.map((row) => ({
        ...row,
        label: new Date(row.at).toLocaleString(
            'es-MX',
            longRange ? { day: '2-digit', month: 'short', hour: '2-digit' } : { day: '2-digit', hour: '2-digit', minute: '2-digit' },
        ),
    }));

    const stats = [
        { label: 'Activos ahora', value: live.total, hint: `Últimos ${settings.active_seconds} s`, icon: Activity },
        { label: 'Visitantes hoy', value: live.today, hint: 'Visitas iniciadas hoy', icon: Users },
        { label: 'Pico de hoy', value: live.peak_today, hint: 'Máximo simultáneo', icon: TrendingUp },
    ];

    return (
        <>
            <Head title="Visitantes en vivo" />

            <div className="flex w-full max-w-7xl flex-col gap-6 p-4">
                <header className="flex flex-col gap-2 border-b pb-6 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                        <h1 className="text-xl font-semibold tracking-tight">Visitantes en vivo</h1>
                        <p className="mt-1 text-sm text-muted-foreground">
                            Quién está navegando el sitio en este momento. No incluye a quien tiene sesión iniciada ni a los bots.
                        </p>
                        <Link href={report()} className="mt-2 inline-flex items-center gap-1.5 text-sm font-medium text-brand hover:underline">
                            <ChartColumn className="size-4" />
                            Ver reporte de visitas y páginas visitadas
                        </Link>
                    </div>
                    <p className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span className="relative flex size-2">
                            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                            <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
                        </span>
                        Actualizado hace {since(live.generated_at, now)}
                    </p>
                </header>

                {!settings.enabled && (
                    <div className="rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                        El registro de visitantes está apagado (LIVE_VISITORS_ENABLED). El sitio no está mandando latidos.
                    </div>
                )}

                <div className="grid gap-3 sm:grid-cols-3">
                    {stats.map((item) => (
                        <div key={item.label} className="flex items-start justify-between rounded-xl border bg-card p-4">
                            <div>
                                <p className="text-sm text-muted-foreground">{item.label}</p>
                                <p className="mt-1 text-3xl font-bold tracking-tight tabular-nums">{quantity(item.value)}</p>
                                <p className="mt-1 text-xs text-muted-foreground">{item.hint}</p>
                            </div>
                            <item.icon className="size-5 text-muted-foreground" />
                        </div>
                    ))}
                </div>

                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                    <BreakdownCard title="Páginas" rows={live.by_page} total={live.total} />
                    <BreakdownCard title="Origen" rows={live.by_source} total={live.total} />
                    <BreakdownCard title="País" rows={live.by_country} total={live.total} />
                    <BreakdownCard title="Dispositivo" rows={live.by_device.map((row) => ({ ...row, name: DEVICES[row.name] ?? row.name }))} total={live.total} />
                </div>

                <section className="rounded-xl border bg-card">
                    <div className="flex flex-col gap-3 border-b px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <h2 className="font-semibold">Histórico de visitantes simultáneos</h2>
                            <p className="text-xs text-muted-foreground">{longRange ? 'Pico por hora' : 'Una medición cada 5 minutos'}</p>
                        </div>
                        <div className="flex flex-wrap gap-1">
                            {RANGES.map((range) => (
                                <button
                                    key={range.hours}
                                    type="button"
                                    onClick={() => changeRange(range.hours)}
                                    aria-pressed={filters.hours === range.hours}
                                    className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${filters.hours === range.hours ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'}`}
                                >
                                    {range.label}
                                </button>
                            ))}
                        </div>
                    </div>
                    <div className="h-[280px] p-4">
                        {historyData.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={historyData} margin={{ top: 10, right: 20, left: 0, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.15} stroke="#6c0ea3" />
                                    <XAxis dataKey="label" tick={{ fontSize: 11 }} stroke="#9CA3AF" minTickGap={40} />
                                    <YAxis stroke="#9CA3AF" width={40} allowDecimals={false} />
                                    <Tooltip formatter={(value: unknown) => [quantity(Number(value || 0)), 'Visitantes']} {...chartTooltip} />
                                    <Area type="monotone" dataKey="peak" name="Visitantes" stroke="#6c0ea3" fill="#6c0ea3" fillOpacity={0.15} strokeWidth={2} />
                                </AreaChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="flex h-full items-center justify-center text-center text-sm text-muted-foreground">
                                Todavía no hay mediciones en este periodo. Se guarda una cada 5 minutos.
                            </div>
                        )}
                    </div>
                </section>

                <section className="overflow-hidden rounded-xl border bg-card">
                    <div className="border-b px-4 py-3">
                        <h2 className="font-semibold">Visitantes activos</h2>
                        <p className="text-xs text-muted-foreground">
                            {live.visitors.length < live.total
                                ? `Mostrando los ${live.visitors.length} más recientes de ${quantity(live.total)}`
                                : `${quantity(live.total)} en el sitio`}
                        </p>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="min-w-full text-sm">
                            <thead className="bg-muted/40 text-left">
                                <tr>
                                    <th className="px-4 py-3 font-medium">Visitante</th>
                                    <th className="px-4 py-3 font-medium">Página actual</th>
                                    <th className="px-4 py-3 font-medium">Origen</th>
                                    <th className="px-4 py-3 text-right font-medium">Páginas</th>
                                    <th className="px-4 py-3 text-right font-medium">Tiempo en el sitio</th>
                                    <th className="px-4 py-3 text-right font-medium">Última señal</th>
                                </tr>
                            </thead>
                            <tbody>
                                {live.visitors.map((visitor) => (
                                    <tr key={visitor.id} className="border-t transition hover:bg-muted/30">
                                        <td className="px-4 py-3">
                                            <p className="font-semibold">Visitante {visitor.label}</p>
                                            <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                                                <Globe2 className="size-3.5" />
                                                {visitor.country_code || '—'}
                                                {deviceIcon(visitor.device_type)}
                                                {DEVICES[visitor.device_type ?? 'desconocido'] ?? visitor.device_type}
                                            </p>
                                        </td>
                                        <td className="max-w-md px-4 py-3">
                                            <p className="line-clamp-1">{visitor.page_title || visitor.path}</p>
                                            <p className="mt-1 truncate text-xs text-muted-foreground">{visitor.path}</p>
                                        </td>
                                        <td className="px-4 py-3">
                                            <p>{visitor.source}</p>
                                            <p className="mt-1 text-xs text-muted-foreground">{visitor.utm_campaign || `Entró por ${visitor.landing_path || '/'}`}</p>
                                        </td>
                                        <td className="px-4 py-3 text-right tabular-nums">{quantity(visitor.page_views)}</td>
                                        <td className="px-4 py-3 text-right tabular-nums">{since(visitor.first_seen_at, now)}</td>
                                        <td className="px-4 py-3 text-right text-xs text-muted-foreground tabular-nums">hace {since(visitor.last_seen_at, now)}</td>
                                    </tr>
                                ))}
                                {live.visitors.length === 0 && (
                                    <tr>
                                        <td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">
                                            No hay nadie en el sitio en este momento.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </section>
            </div>
        </>
    );
}

LiveVisitors.layout = {
    breadcrumbs: [{ title: 'Visitantes en vivo', href: index() }],
};
