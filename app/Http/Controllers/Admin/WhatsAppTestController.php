<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Services\Semaphore;
use App\Support\PhoneNumber;
use App\Support\WhatsApp\VotingMessages;
use Closure;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Throwable;

class WhatsAppTestController extends Controller
{
    /**
     * Manda el recordatorio y la encuesta reales a un número, para probar
     * plantillas y webhook sin esperar a que abra la votación. No registra
     * recordatorios ni depende del interruptor de «Votar por WhatsApp».
     */
    public function __invoke(Request $request, Semaphore $semaphore, VotingMessages $messages): RedirectResponse
    {
        $validated = $request->validate([
            'test_phone' => [
                'required',
                'string',
                'max:25',
                fn (string $attribute, mixed $value, Closure $fail) => PhoneNumber::normalize((string) $value) === null
                    ? $fail('Escribe un número de WhatsApp válido, por ejemplo 55 1234 5678.')
                    : null,
            ],
            'test_company' => ['nullable', 'string', 'max:100'],
        ]);

        $phone = PhoneNumber::normalize($validated['test_phone']);

        try {
            $messages->send(
                $phone,
                $request->user()->name,
                ($validated['test_company'] ?? null) ?: 'Empresa de prueba',
                $semaphore->session(),
            );
        } catch (Throwable $exception) {
            report($exception);

            throw ValidationException::withMessages([
                'test_phone' => 'No se pudo enviar: '.$exception->getMessage(),
            ]);
        }

        Log::info('Prueba de WhatsApp enviada', ['to' => $phone, 'by' => $request->user()->id]);

        Inertia::flash('toast', ['type' => 'success', 'message' => "Prueba enviada a {$phone}. Revisa WhatsApp en unos segundos."]);

        return to_route('admin.voting.edit');
    }
}
