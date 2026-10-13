import { Head, router, usePage, usePoll } from '@inertiajs/react';
import { useState } from 'react';
import InstallButton from '@/components/install-button';
import SemaphoreCard from '@/components/semaphore-card';
import VoteBadge from '@/components/vote-badge';
import { COLOR_LABELS } from '@/lib/semaphore';
import { cn } from '@/lib/utils';
import { dashboard } from '@/routes';
import { store } from '@/routes/votes';
import type { SemaphoreData, VoteColor, VoteCounts } from '@/types';

type Detail = {
    counts: VoteCounts;
    votes: {
        company: string;
        color: VoteColor | null;
        voted_by: string | null;
        voted_at: string | null;
    }[];
};

const OPTIONS: { color: VoteColor; hint: string; active: string }[] = [
    {
        color: 'green',
        hint: 'Es viable volar',
        active: 'border-emerald-500 bg-emerald-500 text-white',
    },
    {
        color: 'yellow',
        hint: 'Con precaución',
        active: 'border-amber-400 bg-amber-400 text-neutral-900',
    },
    {
        color: 'red',
        hint: 'No es viable volar',
        active: 'border-red-500 bg-red-500 text-white',
    },
];

export default function Dashboard({
    semaphore,
    canVote,
    myVote,
    detail,
    publicVisible,
}: {
    semaphore: SemaphoreData;
    canVote: boolean;
    myVote: VoteColor | null;
    detail: Detail | null;
    publicVisible: boolean;
}) {
    const { auth } = usePage().props;
    const [sending, setSending] = useState(false);
    const isOpen = semaphore.phase === 'open';

    usePoll(15000);

    const vote = (color: VoteColor) => {
        router.post(
            store.url(),
            { color },
            {
                preserveScroll: true,
                onStart: () => setSending(true),
                onFinish: () => setSending(false),
            },
        );
    };

    return (
        <>
            <Head title="Semáforo" />

            <div className="flex h-full flex-1 flex-col gap-6 p-4">
                <InstallButton className="self-start rounded-full border px-4 py-1.5 text-sm hover:bg-accent" />

                <SemaphoreCard semaphore={semaphore} />

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

                        <div className="mt-5 grid gap-3 sm:grid-cols-3">
                            {OPTIONS.map((option) => (
                                <button
                                    key={option.color}
                                    type="button"
                                    disabled={!isOpen || sending}
                                    aria-pressed={myVote === option.color}
                                    onClick={() => vote(option.color)}
                                    className={cn(
                                        'rounded-xl border-2 px-4 py-6 text-center transition-colors disabled:cursor-not-allowed disabled:opacity-50',
                                        myVote === option.color
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
                    </section>
                )}

                {!canVote && !detail && (
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
                        <p className="mt-1 text-sm text-muted-foreground">
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
