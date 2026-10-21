<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;

/**
 * @property int $min_votes
 * @property string $opens_at Hora de apertura en formato H:i.
 * @property string $closes_at Hora de cierre en formato H:i.
 * @property bool $public_visible Si el semáforo se muestra en la página pública.
 * @property bool $whatsapp_enabled Si al abrir la votación se manda recordatorio y encuesta por WhatsApp.
 * @property bool $summary_enabled Si los super admin reciben el resumen diario por WhatsApp.
 * @property string $summary_at Hora del resumen diario en formato H:i.
 */
#[Fillable(['min_votes', 'opens_at', 'closes_at', 'public_visible', 'whatsapp_enabled', 'summary_enabled', 'summary_at'])]
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
