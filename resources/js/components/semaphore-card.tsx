import SemaphoreLight from '@/components/semaphore-light';
import { describeSemaphore, formatFlightDate } from '@/lib/semaphore';
import { cn } from '@/lib/utils';
import type { SemaphoreData, SemaphoreStatus } from '@/types';

const PHASE_LABELS: Record<SemaphoreData['phase'], string> = {
    before: 'Votación por abrir',
    open: 'Votación abierta',
    closed: 'Votación cerrada',
};

/** Colores del sitio público: la tarjeta entera toma el color del resultado. */
const ACCENTS: Record<SemaphoreStatus, { card: string; title: string }> = {
    green: {
        card: 'border-emerald-500 bg-emerald-50',
        title: 'text-emerald-700',
    },
    yellow: { card: 'border-amber-400 bg-amber-50', title: 'text-amber-700' },
    red: { card: 'border-red-500 bg-red-50', title: 'text-red-700' },
    waiting: { card: 'border-brand-soft bg-white', title: 'text-brand' },
    not_open: { card: 'border-brand-soft bg-white', title: 'text-brand' },
};

export default function SemaphoreCard({
    semaphore,
    tone = 'theme',
    className,
}: {
    semaphore: SemaphoreData;
    /** `light` es la versión grande del sitio público, que ignora el modo oscuro. */
    tone?: 'theme' | 'light';
    className?: string;
}) {
    const { title, description } = describeSemaphore(semaphore);
    const isPublic = tone === 'light';
    const accent = ACCENTS[semaphore.status];
    const muted = isPublic ? 'text-neutral-600' : 'text-muted-foreground';

    return (
        <div
            className={cn(
                'flex flex-col items-center gap-6 p-6 sm:flex-row sm:gap-10 sm:p-8',
                isPublic
                    ? cn(
                          'border-y-4 text-neutral-900 transition-colors duration-500 sm:p-10',
                          accent.card,
                      )
                    : 'rounded-2xl border bg-card text-card-foreground',
                className,
            )}
        >
            <SemaphoreLight
                status={semaphore.status}
                size={isPublic ? 'lg' : 'md'}
                className="shrink-0"
            />

            <div className="text-center sm:text-left">
                <p
                    className={cn(
                        'first-letter:uppercase',
                        isPublic ? 'text-base font-semibold' : 'text-sm',
                        muted,
                    )}
                >
                    {formatFlightDate(semaphore.flight_date)}
                </p>
                <h2
                    className={
                        isPublic
                            ? cn(
                                  'mt-2 font-display text-4xl leading-none font-bold uppercase sm:text-6xl',
                                  accent.title,
                              )
                            : 'mt-1 text-3xl font-semibold tracking-tight'
                    }
                >
                    {title}
                </h2>
                <p className={cn(isPublic ? 'mt-4 text-lg' : 'mt-2', muted)}>
                    {description}
                </p>
                <p className={cn('mt-4 text-sm', muted)}>
                    {PHASE_LABELS[semaphore.phase]} ({semaphore.opens_at} a{' '}
                    {semaphore.closes_at} h) · {semaphore.votes_count} de{' '}
                    {semaphore.companies_count} empresas han votado
                </p>
            </div>
        </div>
    );
}
