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

export function describeSemaphore(semaphore: SemaphoreData): {
    title: string;
    description: string;
} {
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
                    'No hay mayoría a favor de volar. Las condiciones siguen en evaluación.',
            };
        case 'red':
            return {
                title: 'Vuelos no viables',
                description:
                    'La mayoría de las empresas considera que no hay condiciones para volar.',
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
