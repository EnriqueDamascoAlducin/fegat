<?php

namespace App\Support;

/**
 * Título y explicación del semáforo para otros sistemas. Es el mismo texto que la página
 * pública (resources/js/lib/semaphore.ts → describeSemaphore): si cambia uno, cambia el otro.
 */
final class SemaphoreText
{
    private const DECIDED = [
        'green' => ['Volamos', 'Decisión oficial: hay condiciones para volar en esta jornada.'],
        'yellow' => ['En espera', 'Decisión oficial: los vuelos quedan en espera hasta nuevo aviso.'],
        'red' => ['Se cancela', 'Decisión oficial: los vuelos de esta jornada se cancelan.'],
    ];

    private const VOTED = [
        'green' => ['Volamos', 'La mayoría de las empresas considera favorables las condiciones.'],
        'yellow' => ['En espera', 'No hay mayoría a favor de volar. Los vuelos quedan en espera.'],
        'red' => ['Se cancela', 'No hay mayoría a favor de volar. Por seguridad, los vuelos se cancelan.'],
    ];

    /**
     * @param  array{status: string, decided: bool, phase: string, opens_at: string, closes_at: string}  $semaphore
     * @return array{title: string, description: string}
     */
    public static function describe(array $semaphore): array
    {
        $status = $semaphore['status'];

        [$title, $description] = match (true) {
            $semaphore['decided'] && isset(self::DECIDED[$status]) => self::DECIDED[$status],
            isset(self::VOTED[$status]) => self::VOTED[$status],
            $status === 'not_open' => ['Votación aún no abre', "Las empresas votan de {$semaphore['opens_at']} a {$semaphore['closes_at']} h."],
            default => [
                'Esperando votos',
                $semaphore['phase'] === 'closed'
                    ? 'La votación cerró sin alcanzar el mínimo de votos.'
                    : 'Aún no hay votos suficientes para emitir un resultado.',
            ],
        };

        return ['title' => $title, 'description' => $description];
    }
}
