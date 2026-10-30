import { Head, router, usePage } from '@inertiajs/react';
import { Fragment, useState } from 'react';
import Heading from '@/components/heading';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { participation } from '@/routes/admin';

type Company = {
    id: number;
    name: string;
    has_voters: boolean;
    eligible: number;
    voted: number;
    missed: number;
    missed_percent: number | null;
    streak: number;
    missed_dates: string[];
};

type Filters = {
    desde: string;
    hasta: string;
};

function parseDate(value: string): Date {
    const [year, month, day] = value.split('-').map(Number);

    return new Date(year, month - 1, day);
}

function toKey(date: Date): string {
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    return `${date.getFullYear()}-${month}-${day}`;
}

function shortDate(value: string): string {
    return parseDate(value).toLocaleDateString('es-MX', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
    });
}

function Kpi({
    label,
    value,
    detail,
}: {
    label: string;
    value: string | number;
    detail: string;
}) {
    return (
        <div className="rounded-2xl border p-6">
            <p className="text-sm text-muted-foreground">{label}</p>
            <p className="mt-2 text-3xl font-semibold tabular-nums">{value}</p>
            <p className="mt-1 text-sm text-muted-foreground">{detail}</p>
        </div>
    );
}

export default function Participation({
    filters,
    today,
    dates_count: datesCount,
    companies,
}: {
    filters: Filters;
    today: string;
    dates_count: number;
    companies: Company[];
}) {
    const { errors } = usePage().props as { errors: Record<string, string> };
    const [openId, setOpenId] = useState<number | null>(null);

    const apply = (changes: Partial<Filters>) =>
        router.get(
            participation.url({ query: { ...filters, ...changes } }),
            {},
            { preserveState: true, preserveScroll: true, replace: true },
        );

    const end = parseDate(today);
    const ranges = [
        {
            label: 'Últimos 30 días',
            desde: toKey(
                new Date(end.getFullYear(), end.getMonth(), end.getDate() - 29),
            ),
        },
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

    const eligible = companies.reduce((sum, row) => sum + row.eligible, 0);
    const voted = companies.reduce((sum, row) => sum + row.voted, 0);
    const withMisses = companies.filter((row) => row.missed > 0).length;

    return (
        <>
            <Head title="Cumplimiento de votación" />

            <div className="flex flex-col gap-6 p-4">
                <Heading
                    title="Cumplimiento de votación"
                    description="Qué empresas faltan más a votar en el periodo, de la que más falta a la que menos."
                />

                <div className="flex flex-col gap-4 rounded-2xl border p-4 lg:flex-row lg:items-end">
                    <div className="grid flex-1 gap-4 sm:grid-cols-2">
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

                <div className="grid gap-4 sm:grid-cols-3">
                    <Kpi
                        label="Jornadas evaluadas"
                        value={datesCount}
                        detail="cerradas y con al menos un voto"
                    />
                    <Kpi
                        label="Cumplimiento general"
                        value={
                            eligible === 0
                                ? '—'
                                : `${Math.round((voted / eligible) * 100)} %`
                        }
                        detail={`${voted} de ${eligible} votos esperados`}
                    />
                    <Kpi
                        label="Empresas con faltas"
                        value={withMisses}
                        detail={`de ${companies.length} empresas activas`}
                    />
                </div>

                {datesCount === 0 ? (
                    <p className="rounded-2xl border p-6 text-sm text-muted-foreground">
                        No hay jornadas para evaluar en este periodo.
                    </p>
                ) : (
                    <div className="overflow-x-auto rounded-2xl border p-4">
                        <table className="w-full min-w-[640px] text-left text-sm">
                            <thead className="text-muted-foreground">
                                <tr className="border-b">
                                    <th className="py-2 pr-4 font-medium">
                                        Empresa
                                    </th>
                                    <th className="py-2 pr-4 text-right font-medium">
                                        Faltas
                                    </th>
                                    <th className="py-2 pr-4 text-right font-medium">
                                        % de faltas
                                    </th>
                                    <th className="py-2 pr-4 text-right font-medium">
                                        Votó
                                    </th>
                                    <th className="py-2 pr-4 text-right font-medium">
                                        Faltas seguidas
                                    </th>
                                    <th className="py-2 font-medium">
                                        <span className="sr-only">Fechas</span>
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {companies.map((company) => (
                                    <Fragment key={company.id}>
                                        <tr className="border-b last:border-0">
                                            <td className="py-3 pr-4">
                                                {company.name}
                                                {!company.has_voters && (
                                                    <span className="ml-2 inline-block rounded-full border px-2 py-0.5 text-xs whitespace-nowrap text-muted-foreground">
                                                        Sin usuarios para votar
                                                    </span>
                                                )}
                                            </td>
                                            <td className="py-3 pr-4 text-right font-semibold tabular-nums">
                                                {company.missed}
                                            </td>
                                            <td className="py-3 pr-4 text-right tabular-nums">
                                                {company.missed_percent === null
                                                    ? '—'
                                                    : `${company.missed_percent} %`}
                                            </td>
                                            <td className="py-3 pr-4 text-right whitespace-nowrap tabular-nums">
                                                {company.voted} de{' '}
                                                {company.eligible}
                                            </td>
                                            <td className="py-3 pr-4 text-right tabular-nums">
                                                {company.streak}
                                            </td>
                                            <td className="py-3 text-right">
                                                {company.missed > 0 && (
                                                    <Button
                                                        type="button"
                                                        size="sm"
                                                        variant="ghost"
                                                        aria-expanded={
                                                            openId ===
                                                            company.id
                                                        }
                                                        onClick={() =>
                                                            setOpenId(
                                                                openId ===
                                                                    company.id
                                                                    ? null
                                                                    : company.id,
                                                            )
                                                        }
                                                    >
                                                        {openId === company.id
                                                            ? 'Ocultar'
                                                            : 'Ver fechas'}
                                                    </Button>
                                                )}
                                            </td>
                                        </tr>
                                        {openId === company.id && (
                                            <tr className="border-b last:border-0">
                                                <td
                                                    colSpan={6}
                                                    className="pb-3 text-muted-foreground"
                                                >
                                                    Faltó el:{' '}
                                                    {company.missed_dates
                                                        .map(shortDate)
                                                        .join(' · ')}
                                                </td>
                                            </tr>
                                        )}
                                    </Fragment>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                <p className="text-sm text-muted-foreground">
                    Solo cuentan las jornadas cerradas en las que votó al menos
                    una empresa. A cada empresa se le cuenta desde el día
                    siguiente a su alta, y las inactivas no aparecen.
                </p>
            </div>
        </>
    );
}

Participation.layout = {
    breadcrumbs: [
        {
            title: 'Cumplimiento',
            href: participation(),
        },
    ],
};
