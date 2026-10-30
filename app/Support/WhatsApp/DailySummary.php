<?php

namespace App\Support\WhatsApp;

use App\Contracts\WhatsAppSender;
use App\Models\Company;
use App\Models\FinalDecision;
use App\Models\VotingSetting;
use App\Services\Semaphore;
use Carbon\CarbonImmutable;
use RuntimeException;

/**
 * Resumen de una jornada para los super admin: resultado, participación y
 * qué votó cada empresa (y quién).
 *
 * WhatsApp no acepta saltos de línea dentro de las variables de una plantilla,
 * así que cada color tiene su propia variable y su renglón fijo en la plantilla.
 */
class DailySummary
{
    /** Tope de cada lista; el mensaje completo no puede pasar de 1024 caracteres. */
    private const LIST_LIMIT = 400;

    public function __construct(private WhatsAppSender $whatsApp, private Semaphore $semaphore) {}

    public static function isReady(): bool
    {
        return TwilioWhatsApp::isConfigured() && filled(config('services.twilio.template_daily_summary'));
    }

    /**
     * Variables de la plantilla para una jornada (Y-m-d).
     *
     * @return array{1: string, 2: string, 3: string, 4: string, 5: string, 6: string, 7: string}
     */
    public function variables(string $flightDate): array
    {
        $companies = Company::query()
            ->where('is_active', true)
            ->orderBy('name')
            ->with(['votes' => fn ($query) => $query->where('flight_date', $flightDate)->with('user:id,name')])
            ->get();

        $voted = ['green' => [], 'yellow' => [], 'red' => []];
        $missing = [];

        foreach ($companies as $company) {
            $vote = $company->votes->first();

            if (! $vote) {
                $missing[] = $company->name;

                continue;
            }

            $voted[$vote->color->value][] = $company->name.($vote->user ? " ({$vote->user->name})" : '');
        }

        $counts = array_map(count(...), $voted);
        $total = array_sum($counts);
        $decision = FinalDecision::query()->where('flight_date', $flightDate)->first();
        $status = $decision?->color->value ?? $this->semaphore->decide($counts, VotingSetting::current()->min_votes);

        $result = match ($status) {
            'green' => 'Volamos (verde)',
            'yellow' => 'En espera (amarillo)',
            'red' => 'Se cancela (rojo)',
            default => 'Sin resultado: no se alcanzó el mínimo de votos',
        };

        // WhatsApp rechaza las variables vacías.
        $list = fn (array $names): string => $names === []
            ? 'Ninguna'
            : mb_strimwidth(implode(', ', $names), 0, self::LIST_LIMIT, '…');

        return [
            '1' => CarbonImmutable::parse($flightDate)->translatedFormat('l j \d\e F'),
            '2' => $result.($decision ? ' · decisión oficial' : ''),
            '3' => "{$total} de {$companies->count()} empresas",
            '4' => $list($voted['green']),
            '5' => $list($voted['yellow']),
            '6' => $list($voted['red']),
            '7' => $list($missing),
        ];
    }

    /**
     * @throws RuntimeException si Twilio no está listo o rechaza el envío.
     */
    public function send(string $toE164, string $flightDate): void
    {
        if (! self::isReady()) {
            throw new RuntimeException('Falta configurar Twilio o la plantilla del resumen (TWILIO_TEMPLATE_DAILY_SUMMARY).');
        }

        $this->whatsApp->sendTemplate($toE164, config('services.twilio.template_daily_summary'), $this->variables($flightDate));
    }
}
