<?php

namespace App\Console\Commands;

use App\Enums\UserRole;
use App\Models\User;
use App\Models\Vote;
use App\Models\VotingSetting;
use App\Models\WhatsappReminder;
use App\Services\Semaphore;
use App\Support\WhatsApp\VotingMessages;
use Illuminate\Console\Command;
use Illuminate\Database\UniqueConstraintViolationException;
use Throwable;

/**
 * Corre cada minuto. Mientras la votación está abierta, a la hora del primer
 * recordatorio (y, si está configurada, a la del segundo) manda a cada
 * administrador de empresa que aún no vota el enlace y la encuesta para votar
 * desde WhatsApp. Cada envío sale una sola vez por jornada, aunque el servidor
 * haya estado apagado a esa hora; si se perdió el primero y ya toca el segundo,
 * solo se manda el segundo.
 */
class SendVotingReminders extends Command
{
    /**
     * @var string
     */
    protected $signature = 'fegat:whatsapp-recordatorios';

    /**
     * @var string
     */
    protected $description = 'Envía por WhatsApp el recordatorio y la encuesta de votación de la jornada';

    public function handle(Semaphore $semaphore, VotingMessages $messages): int
    {
        $settings = VotingSetting::current();

        if (! $settings->whatsapp_enabled || ! VotingMessages::isReady()) {
            return self::SUCCESS;
        }

        $session = $semaphore->session();

        if ($session['phase'] !== 'open') {
            return self::SUCCESS;
        }

        $kind = $this->dueKind($settings);

        if ($kind === null) {
            return self::SUCCESS;
        }

        $flightDate = $session['flight_date'];

        $recipients = User::query()
            ->with('company')
            ->where('role', UserRole::CompanyAdmin)
            ->whereNotNull('phone')
            ->whereHas('company', fn ($query) => $query->where('is_active', true))
            ->whereNotIn('company_id', Vote::query()->select('company_id')->where('flight_date', $flightDate))
            ->whereNotIn('id', WhatsappReminder::query()->select('user_id')->where('flight_date', $flightDate)->where('kind', $kind))
            ->get();

        foreach ($recipients as $user) {
            // El registro va primero: si dos procesos coinciden, solo uno envía.
            try {
                $reminder = WhatsappReminder::query()->create([
                    'flight_date' => $flightDate,
                    'user_id' => $user->id,
                    'kind' => $kind,
                    'status' => 'sent',
                ]);
            } catch (UniqueConstraintViolationException) {
                continue;
            }

            try {
                $messages->send($user->phone, $user->name, $user->company->name, $session);
            } catch (Throwable $exception) {
                report($exception);
                $reminder->update(['status' => 'failed', 'error' => mb_substr($exception->getMessage(), 0, 250)]);

                continue;
            }

            $this->line("Enviado a {$user->name} ({$user->company->name}).");
        }

        return self::SUCCESS;
    }

    /**
     * El último envío cuya hora ya pasó: «reminder» o «reminder_2». Null si
     * todavía no llega la hora del primero.
     */
    private function dueKind(VotingSetting $settings): ?string
    {
        $elapsed = $settings->minutesAfterOpening(now()->format('H:i'));

        return match (true) {
            $settings->reminder_second_at !== null && $elapsed >= $settings->minutesAfterOpening($settings->reminder_second_at) => 'reminder_2',
            $elapsed >= $settings->minutesAfterOpening($settings->reminder_first_at) => 'reminder',
            default => null,
        };
    }
}
