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
 * Corre cada minuto. Mientras la votación está abierta, manda a cada
 * administrador de empresa que aún no vota un recordatorio con el enlace y la
 * encuesta para votar desde WhatsApp. A cada uno se le escribe una sola vez
 * por jornada, aunque el servidor haya estado apagado a la hora de apertura.
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
        if (! VotingSetting::current()->whatsapp_enabled || ! VotingMessages::isReady()) {
            return self::SUCCESS;
        }

        $session = $semaphore->session();

        if ($session['phase'] !== 'open') {
            return self::SUCCESS;
        }

        $flightDate = $session['flight_date'];

        $recipients = User::query()
            ->with('company')
            ->where('role', UserRole::CompanyAdmin)
            ->whereNotNull('phone')
            ->whereHas('company', fn ($query) => $query->where('is_active', true))
            ->whereNotIn('company_id', Vote::query()->select('company_id')->where('flight_date', $flightDate))
            ->whereNotIn('id', WhatsappReminder::query()->select('user_id')->where('flight_date', $flightDate))
            ->get();

        foreach ($recipients as $user) {
            // El registro va primero: si dos procesos coinciden, solo uno envía.
            try {
                $reminder = WhatsappReminder::query()->create([
                    'flight_date' => $flightDate,
                    'user_id' => $user->id,
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
}
