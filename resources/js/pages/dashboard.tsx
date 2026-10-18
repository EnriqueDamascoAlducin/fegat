import { Deferred, Head, router, usePage, usePoll } from '@inertiajs/react';
import { useState } from 'react';
import InstallButton from '@/components/install-button';
import SemaphoreCard from '@/components/semaphore-card';
import WeatherCard, { WeatherCardSkeleton } from '@/components/weather-card';
import { Button } from '@/components/ui/button';
import VoteBadge from '@/components/vote-badge';
import { COLOR_LABELS } from '@/lib/semaphore';
import { cn } from '@/lib/utils';
import { dashboard } from '@/routes';
import {
    destroy as removeDecision,
    store as storeDecision,
} from '@/routes/decision';
import { store as storeVote } from '@/routes/votes';
import type {
    SemaphoreData,
    VoteColor,
    VoteCounts,
    WeatherData,
} from '@/types';

type Detail = {
    counts: VoteCounts;
    votes: {
        company: string;
        color: VoteColor | null;
        voted_by: string | null;
        voted_at: string | null;
    }[];
};

type Decision = {
    color: VoteColor;
    decided_by: string | null;
    decided_at: string | null;
};

const OPTIONS: { color: VoteColor; hint: string; active: string }[] = [
    {
        color: 'green',
        hint: 'Volamos',
        active: 'border-emerald-500 bg-emerald-500 text-white',
    },
    {
        color: 'yellow',
        hint: 'En espera',
        active: 'border-amber-400 bg-amber-400 text-neutral-900',
    },
    {
        color: 'red',
        hint: 'Se cancela',
        active: 'border-red-500 bg-red-500 text-white',
    },
];

function ColorButtons({
    selected,
    disabled,
    onSelect,
}: {
    selected: VoteColor | null;
    disabled: boolean;
    onSelect: (color: VoteColor) => void;
}) {
    return (
        <div className="mt-5 grid gap-3 sm:grid-cols-3">
            {OPTIONS.map((option) => (
                <button
                    key={option.color}
                    type="button"
                    disabled={disabled}
                    aria-pressed={selected === option.color}
                    onClick={() => onSelect(option.color)}
                    className={cn(
                        'rounded-xl border-2 px-4 py-6 text-center transition-colors disabled:cursor-not-allowed disabled:opacity-50',
                        selected === option.color
                            ? option.active
                            : 'hover:bg-accent',
                    )}
                >
                    <span className="block text-xl font-semibold">
                        {COLOR_LABELS[option.color]}
                    </span>
                    <span className="mt-1 block text-sm opacity-80">
                        {option.hint}
                    </span>
                </button>
            ))}
        </div>
    );
}

export default function Dashboard({
    semaphore,
    canVote,
    canDecide,
    myVote,
    decision,
    detail,
    publicVisible,
    weather,
}: {
    semaphore: SemaphoreData;
    /** Prop diferida: llega después de pintar la página. */
    weather?: WeatherData | null;
    canVote: boolean;
    canDecide: boolean;
    myVote: VoteColor | null;
    decision: Decision | null;
    detail: Detail | null;
    publicVisible: boolean;
}) {
    const { auth } = usePage().props;
    const [sending, setSending] = useState(false);
    const isOpen = semaphore.phase === 'open';

    // El clima tiene su propia caché; no hace falta pedirlo en cada sondeo.
    usePoll(15000, { except: ['weather'] });

    const visitOptions = {
        preserveScroll: true,
        onStart: () => setSending(true),
        onFinish: () => setSending(false),
    };

    return (
        <>
            <Head title="Semáforo" />

            <div className="flex h-full flex-1 flex-col gap-6 p-4">
                <InstallButton className="self-start rounded-full border px-4 py-1.5 text-sm hover:bg-accent" />

                <SemaphoreCard semaphore={semaphore} />

                <Deferred data="weather" fallback={<WeatherCardSkeleton />}>
                    <WeatherCard weather={weather ?? null} />
                </Deferred>

                {canDecide && (
                    <section className="rounded-2xl border p-6">
                        <h2 className="text-lg font-semibold">
                            Decisión final
                        </h2>
                        <p className="mt-1 text-sm text-muted-foreground">
                            El color que elijas es el que se publica en la
                            página, sin considerar los votos de las empresas.
                            Puedes cambiarlo en cualquier momento.
                        </p>

                        <ColorButtons
                            selected={decision?.color ?? null}
                            disabled={sending}
                            onSelect={(color) =>
                                router.post(
                                    storeDecision.url(),
                                    { color },
                                    visitOptions,
                                )
                            }
                        />

                        {decision && (
                            <div className="mt-5 flex flex-wrap items-center gap-3">
                                <p className="text-sm text-muted-foreground">
                                    Decisión vigente desde las{' '}
                                    {decision.decided_at} h.
                                </p>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    disabled={sending}
                                    onClick={() =>
                                        router.delete(
                                            removeDecision.url(),
                                            visitOptions,
                                        )
                                    }
                                >
                                    Retirar decisión y volver al cálculo por
                                    votos
                                </Button>
                            </div>
                        )}
                    </section>
                )}

                {canVote && (
                    <section className="rounded-2xl border p-6">
                        <h2 className="text-lg font-semibold">
                            Voto de {auth.user.company?.name}
                        </h2>
                        <p className="mt-1 text-sm text-muted-foreground">
                            {isOpen
                                ? myVote
                                    ? 'Ya votaste. Puedes cambiar tu voto mientras la votación siga abierta.'
                                    : 'Selecciona un color. Solo tu empresa puede ver este voto.'
                                : `La votación está cerrada. Horario: ${semaphore.opens_at} a ${semaphore.closes_at} h.`}
                        </p>

                        <ColorButtons
                            selected={myVote}
                            disabled={!isOpen || sending}
                            onSelect={(color) =>
                                router.post(
                                    storeVote.url(),
                                    { color },
                                    visitOptions,
                                )
                            }
                        />
                    </section>
                )}

                {!canVote && !canDecide && !detail && (
                    <p className="rounded-2xl border p-6 text-sm text-muted-foreground">
                        Tu usuario no está ligado a una empresa activa, así que
                        no puede votar. Contacta al administrador de FEGAT.
                    </p>
                )}

                {detail && !publicVisible && (
                    <p className="rounded-2xl border border-amber-400/60 bg-amber-50 p-4 text-sm text-amber-900 dark:bg-amber-400/10 dark:text-amber-200">
                        El semáforo está oculto en la página pública. Puedes
                        volver a mostrarlo en Votación.
                    </p>
                )}

                {detail && (
                    <section className="rounded-2xl border p-6">
                        <h2 className="text-lg font-semibold">
                            Votos de la jornada
                        </h2>

                        {decision && (
                            <p className="mt-3 flex flex-wrap items-center gap-2 rounded-xl border border-brand-soft/60 p-3 text-sm">
                                <span className="font-medium">
                                    Decisión final:
                                </span>
                                <VoteBadge color={decision.color} />
                                <span className="text-muted-foreground">
                                    {decision.decided_by ?? 'Decisor'} ·{' '}
                                    {decision.decided_at} h. Este es el color
                                    publicado; los votos de abajo no lo cambian.
                                </span>
                            </p>
                        )}

                        <p className="mt-3 text-sm text-muted-foreground">
                            Verde {detail.counts.green} · Amarillo{' '}
                            {detail.counts.yellow} · Rojo {detail.counts.red} ·
                            Mínimo para emitir resultado: {semaphore.min_votes}
                        </p>

                        <div className="mt-4 overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead className="text-muted-foreground">
                                    <tr className="border-b">
                                        <th className="py-2 pr-4 font-medium">
                                            Empresa
                                        </th>
                                        <th className="py-2 pr-4 font-medium">
                                            Voto
                                        </th>
                                        <th className="py-2 pr-4 font-medium">
                                            Votó
                                        </th>
                                        <th className="py-2 font-medium">
                                            Hora
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {detail.votes.map((row) => (
                                        <tr
                                            key={row.company}
                                            className="border-b last:border-0"
                                        >
                                            <td className="py-2 pr-4">
                                                {row.company}
                                            </td>
                                            <td className="py-2 pr-4">
                                                <VoteBadge color={row.color} />
                                            </td>
                                            <td className="py-2 pr-4">
                                                {row.voted_by ?? '—'}
                                            </td>
                                            <td className="py-2 tabular-nums">
                                                {row.voted_at ?? '—'}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </section>
                )}
            </div>
        </>
    );
}

Dashboard.layout = {
    breadcrumbs: [
        {
            title: 'Semáforo',
            href: dashboard(),
        },
    ],
};
