<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;

/**
 * @property int $min_votes
 * @property string $opens_at Hora de apertura en formato H:i.
 * @property string $closes_at Hora de cierre en formato H:i.
 * @property bool $public_visible Si el semáforo se muestra en la página pública.
 * @property bool $whatsapp_enabled Si se manda recordatorio y encuesta por WhatsApp a las horas configuradas.
 * @property string $reminder_first_at Hora del primer recordatorio en formato H:i.
 * @property string|null $reminder_second_at Hora del segundo recordatorio en formato H:i; null lo manda una sola vez.
 * @property bool $summary_enabled Si los super admin reciben el resumen diario por WhatsApp.
 * @property string $summary_at Hora del resumen diario en formato H:i.
 */
#[Fillable(['min_votes', 'opens_at', 'closes_at', 'public_visible', 'whatsapp_enabled', 'reminder_first_at', 'reminder_second_at', 'summary_enabled', 'summary_at'])]
class VotingSetting extends Model
{
    /**
     * @var array<string, mixed>
     */
    protected $attributes = [
        'public_visible' => true,
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'min_votes' => 'integer',
            'public_visible' => 'boolean',
            'whatsapp_enabled' => 'boolean',
            'summary_enabled' => 'boolean',
        ];
    }

    /**
     * Minutos que pasan desde la apertura hasta la hora dada. Sirve para
     * comparar horas aunque la votación cruce la medianoche.
     */
    public function minutesAfterOpening(string $time): int
    {
        $toMinutes = fn (string $value): int => (int) substr($value, 0, 2) * 60 + (int) substr($value, 3, 2);

        return ($toMinutes($time) - $toMinutes($this->opens_at) + 1440) % 1440;
    }

    /**
     * Si la hora dada cae dentro del horario de votación (incluye la apertura,
     * no el cierre).
     */
    public function isWithinVoting(string $time): bool
    {
        return $this->minutesAfterOpening($time) < $this->minutesAfterOpening($this->closes_at);
    }

    /**
     * La configuración es un único registro compartido por toda la federación.
     */
    public static function current(): self
    {
        return static::query()->first() ?? static::query()->create([
            'min_votes' => 2,
            'opens_at' => '05:00',
            'closes_at' => '07:00',
        ]);
    }
}
