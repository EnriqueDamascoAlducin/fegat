<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Recordatorio de WhatsApp de una jornada para un usuario: evita repetirlo y
 * deja constancia de si falló.
 *
 * @property string $flight_date
 * @property 'sent'|'failed' $status
 * @property string|null $error
 */
#[Fillable(['flight_date', 'user_id', 'status', 'error'])]
class WhatsappReminder extends Model
{
    /**
     * @return BelongsTo<User, $this>
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
