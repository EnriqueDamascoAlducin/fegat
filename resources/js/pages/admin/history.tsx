import { Head, router } from '@inertiajs/react';
import Heading from '@/components/heading';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import VoteBadge from '@/components/vote-badge';
import { formatFlightDate } from '@/lib/semaphore';
import { cn } from '@/lib/utils';
import { history } from '@/routes/admin';
import type { VoteColor, VoteCounts } from '@/types';

type Change = {
    id: string;
    is_decision: boolean;
    company: string;
    user_name: string;
    from_color: VoteColor | null;
    to_color: VoteColor | null;
    at: string | null;
};

export default function History({
    date,
    counts,
    changes,
}: {
    date: string;
    counts: VoteCounts;
    changes: Change[];
}) {
    return (
        <>
            <Head title="Historial de votos" />

            <div className="max-w-3xl space-y-6 p-4">
                <Heading
                    title="Historial de votos"
                    description="Cada voto, cambio de voto y decisión final queda registrado con quién lo hizo y a qué hora."
                />

                <div className="grid max-w-xs gap-2">
                    <Label htmlFor="fecha">Jornada</Label>
                    <Input
                        id="fecha"
                        type="date"
                        value={date}
                        onChange={(event) =>
                            event.target.value &&
                            router.get(
                                history.url({
                                    query: { fecha: event.target.value },
                                }),
                                {},
                                { preserveState: true },
                            )
                        }
                    />
                </div>

                <p className="text-sm text-muted-foreground">
                    <span className="first-letter:uppercase">
                        {formatFlightDate(date)}
                    </span>{' '}
                    · Votos de las empresas: Verde {counts.green} · Amarillo{' '}
                    {counts.yellow} · Rojo {counts.red}
                </p>

                {changes.length === 0 ? (
                    <p className="rounded-2xl border p-6 text-sm text-muted-foreground">
                        No hay votos registrados en esta jornada.
                    </p>
                ) : (
                    <div className="overflow-x-auto rounded-2xl border p-4">
                        <table className="w-full text-left text-sm">
                            <thead className="text-muted-foreground">
                                <tr className="border-b">
                                    <th className="py-2 pr-4 font-medium">
                                        Hora
                                    </th>
                                    <th className="py-2 pr-4 font-medium">
                                        Empresa
                                    </th>
                                    <th className="py-2 pr-4 font-medium">
                                        Usuario
                                    </th>
                                    <th className="py-2 font-medium">Voto</th>
                                </tr>
                            </thead>
                            <tbody>
                                {changes.map((change) => (
                                    <tr
                                        key={change.id}
                                        className="border-b last:border-0"
                                    >
                                        <td className="py-2 pr-4 tabular-nums">
                                            {change.at}
                                        </td>
                                        <td
                                            className={cn(
                                                'py-2 pr-4',
                                                change.is_decision &&
                                                    'font-semibold',
                                            )}
                                        >
                                            {change.company}
                                        </td>
                                        <td className="py-2 pr-4">
                                            {change.user_name}
                                        </td>
                                        <td className="py-2">
                                            {change.from_color && (
                                                <>
                                                    <VoteBadge
                                                        color={
                                                            change.from_color
                                                        }
                                                    />
                                                    <span className="mx-2 text-muted-foreground">
                                                        →
                                                    </span>
                                                </>
                                            )}
                                            {change.to_color ? (
                                                <VoteBadge
                                                    color={change.to_color}
                                                />
                                            ) : (
                                                <span className="text-muted-foreground">
                                                    Retirada
                                                </span>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </>
    );
}

History.layout = {
    breadcrumbs: [
        {
            title: 'Historial',
            href: history(),
        },
    ],
};
