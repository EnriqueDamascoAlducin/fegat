import type { SemaphoreData, VoteColor } from '@/types';

export const COLOR_LABELS: Record<VoteColor, string> = {
    green: 'Verde',
    yellow: 'Amarillo',
    red: 'Rojo',
};

export function formatFlightDate(date: string): string {
    return new Date(`${date}T00:00:00`).toLocaleDateString('es-MX', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
    });
}

const DECIDED: Record<VoteColor, { title: string; description: string }> = {
    green: {
        title: 'Vuelos viables',
        description:
            'Decisión oficial: hay condiciones para volar en esta jornada.',
    },
    yellow: {
        title: 'Precaución',
        description:
            'Decisión oficial: se recomienda precaución para los vuelos de esta jornada.',
    },
    red: {
        title: 'Vuelos no viables',
        description:
            'Decisión oficial: no hay condiciones para volar en esta jornada.',
    },
};

export function describeSemaphore(semaphore: SemaphoreData): {
    title: string;
    description: string;
} {
    if (
        semaphore.decided &&
        semaphore.status !== 'waiting' &&
        semaphore.status !== 'not_open'
    ) {
        return DECIDED[semaphore.status];
    }

    switch (semaphore.status) {
        case 'green':
            return {
                title: 'Vuelos viables',
                description:
                    'La mayoría de las empresas considera favorables las condiciones.',
            };
        case 'yellow':
            return {
                title: 'Precaución',
                description:
                    'No hay mayoría a favor de volar. Las empresas recomiendan precaución.',
            };
        case 'red':
            return {
                title: 'Vuelos no viables',
                description:
                    'No hay mayoría a favor de volar. Por seguridad, no se recomienda volar.',
            };
        case 'not_open':
            return {
                title: 'Votación aún no abre',
                description: `Las empresas votan de ${semaphore.opens_at} a ${semaphore.closes_at} h.`,
            };
        default:
            return {
                title: 'En espera',
                description:
                    semaphore.phase === 'closed'
                        ? 'La votación cerró sin alcanzar el mínimo de votos.'
                        : 'Aún no hay votos suficientes para emitir un resultado.',
            };
    }
}
