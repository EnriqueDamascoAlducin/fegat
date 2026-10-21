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
 * así que el detalle va en una sola línea separada por «·».
 */
class DailySummary
{
    public function __construct(private WhatsAppSender $whatsApp, private Semaphore $semaphore) {}

    public static function isReady(): bool
    {
        return TwilioWhatsApp::isConfigured() && filled(config('services.twilio.template_daily_summary'));
    }

    /**
     * Variables de la plantilla para una jornada (Y-m-d).
     *
     * @return array{1: string, 2: string, 3: string, 4: string, 5: string}
     */
    public function variables(string $flightDate): array
    {
        $companies = Company::query()
            ->where('is_active', true)
            ->orderBy('name')
            ->with(['votes' => fn ($query) => $query->where('flight_date', $flightDate)->with('user:id,name')])
            ->get();

        $counts = ['green' => 0, 'yellow' => 0, 'red' => 0];
        $voted = [];
        $missing = [];

        foreach ($companies as $company) {
            $vote = $company->votes->first();

            if (! $vote) {
                $missing[] = $company->name;

                continue;
            }

            $counts[$vote->color->value]++;
            $voted[] = "{$company->name}: {$vote->color->label()}".($vote->user ? " ({$vote->user->name})" : '');
        }

        $total = array_sum($counts);
        $decision = FinalDecision::query()->where('flight_date', $flightDate)->first();
        $status = $decision?->color->value ?? $this->semaphore->decide($counts, VotingSetting::current()->min_votes);

        $result = match ($status) {
            'green' => 'Volamos (verde)',
            'yellow' => 'En espera (amarillo)',
            'red' => 'Se cancela (rojo)',
            default => 'Sin resultado: no se alcanzó el mínimo de votos',
        };

        $detail = $voted ? implode(' · ', $voted) : 'Ninguna empresa votó';

        if ($missing) {
            $detail .= ' · Sin voto: '.implode(', ', $missing);
        }

        return [
            '1' => CarbonImmutable::parse($flightDate)->translatedFormat('l j \d\e F'),
            '2' => $result.($decision ? ' · decisión oficial' : ''),
            '3' => "{$total} de {$companies->count()} empresas",
            '4' => "Verde {$counts['green']} · Amarillo {$counts['yellow']} · Rojo {$counts['red']}",
            // Límite de Meta para una variable.
            '5' => mb_strimwidth($detail, 0, 1000, '…'),
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
