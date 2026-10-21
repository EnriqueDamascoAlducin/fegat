<?php

namespace App\Console\Commands;

use App\Enums\UserRole;
use App\Models\User;
use App\Models\VotingSetting;
use App\Models\WhatsappReminder;
use App\Support\WhatsApp\DailySummary;
use Illuminate\Console\Command;
use Illuminate\Database\UniqueConstraintViolationException;
use Throwable;

/**
 * Corre cada minuto. A partir de la hora configurada (12:00 por omisión),
 * manda a cada super admin con WhatsApp el resumen de la jornada del día:
 * resultado, participación y qué votó cada empresa. Una sola vez por día,
 * aunque el servidor haya estado apagado a esa hora.
 */
class SendDailySummary extends Command
{
    /**
     * @var string
     */
    protected $signature = 'fegat:whatsapp-resumen';

    /**
     * @var string
     */
    protected $description = 'Envía por WhatsApp a los super admin el resumen de votos del día';

    public function handle(DailySummary $summary): int
    {
        $settings = VotingSetting::current();

        if (! $settings->summary_enabled || ! DailySummary::isReady() || now()->format('H:i') < $settings->summary_at) {
            return self::SUCCESS;
        }

        $today = now()->toDateString();

        $recipients = User::query()
            ->where('role', UserRole::SuperAdmin)
            ->whereNotNull('phone')
            ->whereNotIn('id', WhatsappReminder::query()->select('user_id')->where('flight_date', $today)->where('kind', 'summary'))
            ->get();

        foreach ($recipients as $user) {
            // El registro va primero: si dos procesos coinciden, solo uno envía.
            try {
                $sent = WhatsappReminder::query()->create([
                    'flight_date' => $today,
                    'user_id' => $user->id,
                    'kind' => 'summary',
                    'status' => 'sent',
                ]);
            } catch (UniqueConstraintViolationException) {
                continue;
            }

            try {
                $summary->send($user->phone, $today);
            } catch (Throwable $exception) {
                report($exception);
                $sent->update(['status' => 'failed', 'error' => mb_substr($exception->getMessage(), 0, 250)]);

                continue;
            }

            $this->line("Resumen enviado a {$user->name}.");
        }

        return self::SUCCESS;
    }
}
