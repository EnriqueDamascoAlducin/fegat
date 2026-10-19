<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\Semaphore;
use App\Support\SemaphoreText;
use Illuminate\Http\JsonResponse;

class SemaphoreController extends Controller
{
    /**
     * Semáforo de la jornada vigente para sistemas externos. Igual que la página pública,
     * nunca incluye quién votó qué.
     */
    public function __invoke(Semaphore $semaphore): JsonResponse
    {
        $status = $semaphore->status();
        $text = SemaphoreText::describe($status);

        return response()->json([
            'flight_date' => $status['flight_date'],
            // green | yellow | red | waiting (sin quórum) | not_open (la votación aún no abre)
            'status' => $status['status'],
            'title' => $text['title'],
            'description' => $text['description'],
            // true: lo fijó la decisión final, no el conteo de votos.
            'decided' => $status['decided'],
            'phase' => $status['phase'],
            'opens_at' => $status['opens_at'],
            'closes_at' => $status['closes_at'],
            'votes_count' => $status['votes_count'],
            'companies_count' => $status['companies_count'],
            'min_votes' => $status['min_votes'],
            'generated_at' => now()->toIso8601String(),
        ])->header('Cache-Control', 'private, max-age=30');
    }
}
