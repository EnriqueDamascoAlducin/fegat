import { Head, router, usePage } from '@inertiajs/react';
import { useMemo, useState } from 'react';
import type { CSSProperties, MouseEvent, ReactNode } from 'react';
import Heading from '@/components/heading';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { indicators } from '@/routes';

type DayStatus = 'green' | 'yellow' | 'red' | 'waiting';

type Day = {
    date: string;
    status: DayStatus;
    decided: boolean;
    in_progress: boolean;
    votes: number;
    counts: { green: number; yellow: number; red: number } | null;
};

type Filters = {
    desde: string;
    hasta: string;
    estado: DayStatus | null;
};

/**
 * Colores de estado (reservados para el semáforo) y siempre con su etiqueta:
 * el color nunca comunica el resultado por sí solo.
 */
const STATUS: Record<DayStatus, { label: string; swatch: string }> = {
    green: { label: 'Volamos', swatch: 'bg-[#0ca30c]' },
    yellow: { label: 'En espera', swatch: 'bg-[#fab219]' },
    red: { label: 'Se cancela', swatch: 'bg-[#d03b3b]' },
    waiting: {
        label: 'Sin resultado',
        swatch: 'bg-[#b8b5bf] dark:bg-[#6b6875]',
    },
};

const ORDER: DayStatus[] = ['green', 'yellow', 'red', 'waiting'];

const WEEKDAYS = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];

const PAGE_SIZE = 15;

const selectClass =
    'h-9 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 [&>option]:bg-background [&>option]:text-foreground';

/* ---------- Fechas (siempre en hora local, sin desfases por zona horaria) ---------- */

function parseDate(value: string): Date {
    const [year, month, day] = value.split('-').map(Number);

    return new Date(year, month - 1, day);
}

function toKey(date: Date): string {
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    return `${date.getFullYear()}-${month}-${day}`;
}

function addDays(date: Date, days: number): Date {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
}

function longDate(value: string): string {
    return parseDate(value).toLocaleDateString('es-MX', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        year: 'numeric',
    });
}

function monthName(date: Date, style: 'long' | 'short' = 'long'): string {
    return date.toLocaleDateString('es-MX', { month: style, year: 'numeric' });
}

function percent(part: number, total: number): string {
    return total === 0 ? '—' : `${Math.round((part / total) * 100)} %`;
}

/* ---------- Tooltip compartido ---------- */

type Tip = { text: ReactNode; x: number; y: number } | null;

function useTooltip() {
    const [tip, setTip] = useState<Tip>(null);

    const bind = (text: ReactNode) => ({
        onMouseEnter: (event: MouseEvent<HTMLElement>) => {
            const rect = event.currentTarget.getBoundingClientRect();
            setTip({ text, x: rect.left + rect.width / 2, y: rect.top });
        },
        onMouseLeave: () => setTip(null),
    });

    const node = tip && (
        <div
            role="tooltip"
            className="pointer-events-none fixed z-50 -translate-x-1/2 -translate-y-full rounded-md border bg-popover px-3 py-2 text-xs text-popover-foreground shadow-md"
            style={{ left: tip.x, top: tip.y - 8 }}
        >
            {tip.text}
        </div>
    );

    return { bind, node };
}

/* ---------- Piezas ---------- */

function StatusDot({
    status,
    className,
}: {
    status: DayStatus;
    className?: string;
}) {
    return (
        <span
            aria-hidden="true"
            className={cn(
                'inline-block size-2.5 shrink-0 rounded-full',
                STATUS[status].swatch,
                className,
            )}
        />
    );
}

function StatusBadge({ day }: { day: Day }) {
    return (
        <span className="inline-flex items-center gap-2">
            <StatusDot status={day.status} />
            <span className="font-medium">{STATUS[day.status].label}</span>
            {day.in_progress && (
                <span className="rounded-full border px-2 py-0.5 text-xs text-muted-foreground">
                    En curso
                </span>
            )}
        </span>
    );
}

function Legend() {
    return (
        <ul className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted-foreground">
            {ORDER.map((status) => (
                <li key={status} className="flex items-center gap-2">
                    <StatusDot status={status} />
                    {STATUS[status].label}
                </li>
            ))}
        </ul>
    );
}

function Card({
    title,
    description,
    children,
    className,
}: {
    title: string;
    description?: string;
    children: ReactNode;
    className?: string;
}) {
    return (
        <section className={cn('rounded-2xl border p-6', className)}>
            <div className="mb-5">
                <h2 className="text-lg font-semibold">{title}</h2>
                {description && (
                    <p className="mt-1 text-sm text-muted-foreground">
                        {description}
                    </p>
                )}
            </div>
            {children}
        </section>
    );
}

/* ---------- Indicadores clave ---------- */

function Kpis({ days }: { days: Day[] }) {
    const totals = useMemo(() => {
        const result = { green: 0, yellow: 0, red: 0, waiting: 0 };
        days.forEach((day) => result[day.status]++);

        return result;
    }, [days]);
    const decided = totals.green + totals.yellow + totals.red;

    return (
        <div className="grid grid-cols-2 gap-4 xl:grid-cols-5">
            <div className="col-span-2 rounded-2xl border p-6 xl:col-span-1">
                <p className="text-sm text-muted-foreground">Días con vuelo</p>
                <p className="mt-2 text-4xl font-semibold tabular-nums">
                    {percent(totals.green, decided)}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                    {totals.green} de {decided} jornadas con resultado
                </p>
            </div>
            {ORDER.map((status) => (
                <div key={status} className="rounded-2xl border p-6">
                    <p className="flex items-center gap-2 text-sm text-muted-foreground">
                        <StatusDot status={status} />
                        {STATUS[status].label}
                    </p>
                    <p className="mt-2 text-3xl font-semibold tabular-nums">
                        {totals[status]}
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                        {status === 'waiting'
                            ? 'sin votos suficientes'
                            : `${percent(totals[status], decided)} de las jornadas`}
                    </p>
                </div>
            ))}
        </div>
    );
}

/* ---------- Calendario ---------- */

function MonthCalendar({
    month,
    byDate,
    filters,
    today,
    bind,
}: {
    month: Date;
    byDate: Map<string, Day>;
    filters: Filters;
    today: string;
    bind: ReturnType<typeof useTooltip>['bind'];
}) {
    const first = new Date(month.getFullYear(), month.getMonth(), 1);
    const daysInMonth = new Date(
        month.getFullYear(),
        month.getMonth() + 1,
        0,
    ).getDate();
    // Semanas de lunes a domingo.
    const offset = (first.getDay() + 6) % 7;

    return (
        <div>
            <p className="mb-3 text-sm font-medium first-letter:uppercase">
                {monthName(month)}
            </p>
            <div className="grid grid-cols-7 gap-1 text-center text-xs">
                {WEEKDAYS.map((weekday, index) => (
                    <span key={index} className="pb-1 text-muted-foreground">
                        {weekday}
                    </span>
                ))}
                {Array.from({ length: offset }, (_, index) => (
                    <span key={`vacio-${index}`} />
                ))}
                {Array.from({ length: daysInMonth }, (_, index) => {
                    const key = toKey(addDays(first, index));
                    const day = byDate.get(key);
                    const inRange =
                        key >= filters.desde && key <= filters.hasta;
                    const dimmed =
                        day && filters.estado && day.status !== filters.estado;

                    if (!inRange || key > today) {
                        return (
                            <span
                                key={key}
                                className="flex aspect-square items-center justify-center rounded-md text-muted-foreground/40"
                            >
                                {index + 1}
                            </span>
                        );
                    }

                    return (
                        <span
                            key={key}
                            tabIndex={0}
                            aria-label={`${longDate(key)}: ${day ? STATUS[day.status].label : 'sin actividad'}`}
                            {...bind(
                                <>
                                    <span className="block font-medium first-letter:uppercase">
                                        {longDate(key)}
                                    </span>
                                    {day ? (
                                        <span className="mt-1 flex items-center gap-2">
                                            <StatusDot status={day.status} />
                                            {STATUS[day.status].label}
                                            {day.decided &&
                                                ' · decisión oficial'}
                                            {day.in_progress && ' · en curso'}
                                        </span>
                                    ) : (
                                        <span className="mt-1 block text-muted-foreground">
                                            Sin actividad
                                        </span>
                                    )}
                                </>,
                            )}
                            className={cn(
                                'flex aspect-square items-center justify-center rounded-md tabular-nums transition-opacity outline-none focus-visible:ring-2 focus-visible:ring-ring',
                                day
                                    ? [
                                          STATUS[day.status].swatch,
                                          day.status === 'yellow'
                                              ? 'text-neutral-900'
                                              : day.status === 'waiting'
                                                ? 'text-neutral-900 dark:text-white'
                                                : 'text-white',
                                          'font-medium',
                                      ]
                                    : 'bg-muted text-muted-foreground',
                                dimmed && 'opacity-20',
                                day?.in_progress &&
                                    'ring-2 ring-foreground/40 ring-offset-1 ring-offset-background',
                            )}
                        >
                            {index + 1}
                        </span>
                    );
                })}
            </div>
        </div>
    );
}

/* ---------- Distribuciones (por mes y por día de la semana) ---------- */

type Totals = Record<DayStatus, number>;

function countStatuses(days: Day[]): Totals {
    const totals: Totals = { green: 0, yellow: 0, red: 0, waiting: 0 };
    days.forEach((day) => totals[day.status]++);

    return totals;
}

const WEEKDAY_NAMES = [
    'Lunes',
    'Martes',
    'Miércoles',
    'Jueves',
    'Viernes',
    'Sábado',
    'Domingo',
];

function weekdayRows(days: Day[]) {
    return WEEKDAY_NAMES.map((name, index) => ({
        key: name,
        label: name.slice(0, 3),
        title: name,
        totals: countStatuses(
            days.filter(
                (day) => (parseDate(day.date).getDay() + 6) % 7 === index,
            ),
        ),
    }));
}

function monthRows(months: Date[], days: Day[]) {
    return months.map((month) => {
        const prefix = toKey(month).slice(0, 7);

        return {
            key: prefix,
            label: monthName(month, 'short'),
            title: monthName(month),
            totals: countStatuses(
                days.filter((day) => day.date.startsWith(prefix)),
            ),
        };
    });
}

/** Barras apiladas horizontales: una fila por mes o por día de la semana. */
function StackedRows({
    rows,
    bind,
}: {
    rows: { key: string; label: string; title: string; totals: Totals }[];
    bind: ReturnType<typeof useTooltip>['bind'];
}) {
    return (
        <div className="space-y-4">
            {rows.map(({ key, label, title, totals }) => {
                const total = ORDER.reduce(
                    (sum, status) => sum + totals[status],
                    0,
                );
                const segments = ORDER.filter((status) => totals[status] > 0);

                return (
                    <div
                        key={key}
                        className="grid grid-cols-[5.5rem_1fr_4.5rem] items-center gap-3 text-sm"
                    >
                        <span className="text-muted-foreground first-letter:uppercase">
                            {label}
                        </span>
                        {total === 0 ? (
                            <span className="h-3 rounded-full bg-muted" />
                        ) : (
                            <div className="flex h-3 gap-[2px]">
                                {segments.map((status, index) => (
                                    <span
                                        key={status}
                                        {...bind(
                                            <>
                                                <span className="block font-medium first-letter:uppercase">
                                                    {title}
                                                </span>
                                                <span className="mt-1 flex items-center gap-2">
                                                    <StatusDot
                                                        status={status}
                                                    />
                                                    {STATUS[status].label}:{' '}
                                                    {totals[status]}{' '}
                                                    {totals[status] === 1
                                                        ? 'día'
                                                        : 'días'}{' '}
                                                    (
                                                    {percent(
                                                        totals[status],
                                                        total,
                                                    )}
                                                    )
                                                </span>
                                            </>,
                                        )}
                                        className={cn(
                                            'h-full',
                                            STATUS[status].swatch,
                                            index === 0 && 'rounded-l-[4px]',
                                            index === segments.length - 1 &&
                                                'rounded-r-[4px]',
                                        )}
                                        style={
                                            {
                                                flexGrow: totals[status],
                                                flexBasis: 0,
                                            } as CSSProperties
                                        }
                                    />
                                ))}
                            </div>
                        )}
                        <span className="text-right text-muted-foreground tabular-nums">
                            {total} {total === 1 ? 'día' : 'días'}
                        </span>
                    </div>
                );
            })}
        </div>
    );
}

/* ---------- Página ---------- */

export default function Indicators({
    filters,
    today,
    days,
    showVotes,
}: {
    filters: Filters;
    today: string;
    days: Day[];
    showVotes: boolean;
}) {
    const { errors } = usePage().props as { errors: Record<string, string> };
    const { bind, node: tooltip } = useTooltip();

    const byDate = useMemo(
        () => new Map(days.map((day) => [day.date, day])),
        [days],
    );

    const months = useMemo(() => {
        const list: Date[] = [];
        const start = parseDate(filters.desde);
        const end = parseDate(filters.hasta);

        for (
            let cursor = new Date(start.getFullYear(), start.getMonth(), 1);
            cursor <= end;
            cursor = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1)
        ) {
            list.push(cursor);
        }

        return list;
    }, [filters.desde, filters.hasta]);

    const rows = filters.estado
        ? days.filter((day) => day.status === filters.estado)
        : days;

    // La página vuelve a la primera cada vez que cambian los filtros.
    const filtersKey = `${filters.desde}|${filters.hasta}|${filters.estado}`;
    const [paging, setPaging] = useState({ key: filtersKey, page: 0 });
    const pageCount = Math.ceil(rows.length / PAGE_SIZE);
    const page =
        paging.key === filtersKey
            ? Math.max(0, Math.min(paging.page, pageCount - 1))
            : 0;
    const setPage = (next: number) =>
        setPaging({ key: filtersKey, page: next });
    const visibleRows = rows.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

    const apply = (changes: Partial<Filters>) => {
        const next = { ...filters, ...changes };

        router.get(
            indicators.url({
                query: {
                    desde: next.desde,
                    hasta: next.hasta,
                    ...(next.estado ? { estado: next.estado } : {}),
                },
            }),
            {},
            { preserveState: true, preserveScroll: true, replace: true },
        );
    };

    const end = parseDate(today);
    const ranges = [
        { label: 'Últimos 30 días', desde: toKey(addDays(end, -29)) },
        {
            label: 'Este mes',
            desde: toKey(new Date(end.getFullYear(), end.getMonth(), 1)),
        },
        {
            label: 'Últimos 3 meses',
            desde: toKey(new Date(end.getFullYear(), end.getMonth() - 2, 1)),
        },
        {
            label: 'Este año',
            desde: toKey(new Date(end.getFullYear(), 0, 1)),
        },
    ];

    return (
        <>
            <Head title="Indicadores" />

            <div className="flex flex-col gap-6 p-4">
                <Heading
                    title="Indicadores"
                    description="Resultado del semáforo en cada jornada: cuándo se voló, cuándo quedó en espera y cuándo se canceló."
                />

                <div className="flex flex-col gap-4 rounded-2xl border p-4 lg:flex-row lg:items-end">
                    <div className="grid flex-1 gap-4 sm:grid-cols-3">
                        <div className="grid gap-2">
                            <Label htmlFor="desde">Desde</Label>
                            <Input
                                id="desde"
                                type="date"
                                value={filters.desde}
                                max={filters.hasta}
                                onChange={(event) =>
                                    event.target.value &&
                                    apply({ desde: event.target.value })
                                }
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="hasta">Hasta</Label>
                            <Input
                                id="hasta"
                                type="date"
                                value={filters.hasta}
                                min={filters.desde}
                                max={today}
                                onChange={(event) =>
                                    event.target.value &&
                                    apply({ hasta: event.target.value })
                                }
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="estado">Estado</Label>
                            <select
                                id="estado"
                                value={filters.estado ?? ''}
                                onChange={(event) =>
                                    apply({
                                        estado:
                                            (event.target.value as DayStatus) ||
                                            null,
                                    })
                                }
                                className={selectClass}
                            >
                                <option value="">Todos</option>
                                {ORDER.map((status) => (
                                    <option key={status} value={status}>
                                        {STATUS[status].label}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {ranges.map((range) => (
                            <Button
                                key={range.label}
                                type="button"
                                size="sm"
                                variant={
                                    filters.desde === range.desde &&
                                    filters.hasta === today
                                        ? 'default'
                                        : 'outline'
                                }
                                onClick={() =>
                                    apply({ desde: range.desde, hasta: today })
                                }
                            >
                                {range.label}
                            </Button>
                        ))}
                    </div>
                </div>
                <InputError message={errors.hasta ?? errors.desde} />

                <Kpis days={days} />

                <div className="grid gap-6 xl:grid-cols-[2fr_1fr]">
                    <Card
                        title="Calendario"
                        description={
                            filters.estado
                                ? `Resaltadas las jornadas «${STATUS[filters.estado].label}».`
                                : 'Cada día muestra el resultado del semáforo.'
                        }
                    >
                        <div className="mb-5">
                            <Legend />
                        </div>
                        <div className="grid gap-8 sm:grid-cols-2 2xl:grid-cols-3">
                            {months.map((month) => (
                                <MonthCalendar
                                    key={month.toISOString()}
                                    month={month}
                                    byDate={byDate}
                                    filters={filters}
                                    today={today}
                                    bind={bind}
                                />
                            ))}
                        </div>
                    </Card>

                    <div className="flex flex-col gap-6">
                        <Card
                            title="Distribución por mes"
                            description="Jornadas con actividad en cada mes."
                        >
                            <StackedRows
                                rows={monthRows(months, days)}
                                bind={bind}
                            />
                        </Card>
                        <Card
                            title="Por día de la semana"
                            description="Qué días suele haber vuelos."
                        >
                            <StackedRows rows={weekdayRows(days)} bind={bind} />
                        </Card>
                    </div>
                </div>

                <Card
                    title="Jornadas"
                    description={`${rows.length} ${rows.length === 1 ? 'jornada' : 'jornadas'}${filters.estado ? ` con «${STATUS[filters.estado].label}»` : ''}, de la más reciente a la más antigua.`}
                >
                    {rows.length === 0 ? (
                        <p className="text-sm text-muted-foreground">
                            No hay jornadas con estos filtros.
                        </p>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full min-w-[560px] text-left text-sm">
                                <thead className="text-muted-foreground">
                                    <tr className="border-b">
                                        <th className="py-2 pr-4 font-normal">
                                            Fecha
                                        </th>
                                        <th className="py-2 pr-4 font-normal">
                                            Resultado
                                        </th>
                                        <th className="py-2 pr-4 font-normal">
                                            Origen
                                        </th>
                                        <th className="py-2 pr-4 text-right font-normal">
                                            Votos
                                        </th>
                                        {showVotes && (
                                            <th className="py-2 text-right font-normal">
                                                Verde · Amarillo · Rojo
                                            </th>
                                        )}
                                    </tr>
                                </thead>
                                <tbody>
                                    {visibleRows.map((day) => (
                                        <tr
                                            key={day.date}
                                            className="border-b last:border-0"
                                        >
                                            <td className="py-3 pr-4 whitespace-nowrap first-letter:uppercase">
                                                {longDate(day.date)}
                                            </td>
                                            <td className="py-3 pr-4">
                                                <StatusBadge day={day} />
                                            </td>
                                            <td className="py-3 pr-4 text-muted-foreground">
                                                {day.decided
                                                    ? 'Decisión oficial'
                                                    : 'Votación de empresas'}
                                            </td>
                                            <td className="py-3 pr-4 text-right tabular-nums">
                                                {day.votes}
                                            </td>
                                            {showVotes && day.counts && (
                                                <td className="py-3 text-right text-muted-foreground tabular-nums">
                                                    {day.counts.green} ·{' '}
                                                    {day.counts.yellow} ·{' '}
                                                    {day.counts.red}
                                                </td>
                                            )}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {pageCount > 1 && (
                        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground">
                            <span className="tabular-nums">
                                Mostrando {page * PAGE_SIZE + 1}–
                                {Math.min((page + 1) * PAGE_SIZE, rows.length)}{' '}
                                de {rows.length}
                            </span>
                            <div className="flex gap-2">
                                <Button
                                    type="button"
                                    size="sm"
                                    variant="outline"
                                    disabled={page === 0}
                                    onClick={() => setPage(page - 1)}
                                >
                                    Anterior
                                </Button>
                                <Button
                                    type="button"
                                    size="sm"
                                    variant="outline"
                                    disabled={page >= pageCount - 1}
                                    onClick={() => setPage(page + 1)}
                                >
                                    Siguiente
                                </Button>
                            </div>
                        </div>
                    )}
                </Card>
            </div>

            {tooltip}
        </>
    );
}

Indicators.layout = {
    breadcrumbs: [
        {
            title: 'Indicadores',
            href: indicators(),
        },
    ],
};
