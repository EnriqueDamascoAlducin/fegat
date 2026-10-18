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
        title: 'Volamos',
        description:
            'Decisión oficial: hay condiciones para volar en esta jornada.',
    },
    yellow: {
        title: 'En espera',
        description:
            'Decisión oficial: los vuelos quedan en espera hasta nuevo aviso.',
    },
    red: {
        title: 'Se cancela',
        description:
            'Decisión oficial: los vuelos de esta jornada se cancelan.',
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
                title: 'Volamos',
                description:
                    'La mayoría de las empresas considera favorables las condiciones.',
            };
        case 'yellow':
            return {
                title: 'En espera',
                description:
                    'No hay mayoría a favor de volar. Los vuelos quedan en espera.',
            };
        case 'red':
            return {
                title: 'Se cancela',
                description:
                    'No hay mayoría a favor de volar. Por seguridad, los vuelos se cancelan.',
            };
        case 'not_open':
            return {
                title: 'Votación aún no abre',
                description: `Las empresas votan de ${semaphore.opens_at} a ${semaphore.closes_at} h.`,
            };
        default:
            // «En espera» es el amarillo; sin quórum se dice distinto para no confundirlos.
            return {
                title: 'Esperando votos',
                description:
                    semaphore.phase === 'closed'
                        ? 'La votación cerró sin alcanzar el mínimo de votos.'
                        : 'Aún no hay votos suficientes para emitir un resultado.',
            };
    }
}
