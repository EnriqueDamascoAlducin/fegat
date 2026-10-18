<?php

namespace App\Models;

use App\Enums\VoteColor;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Color que el decisor fijó para una jornada. Mientras exista, es el que se
 * publica, sin importar los votos de las empresas.
 *
 * @property string $flight_date Fecha de vuelo en formato Y-m-d.
 * @property VoteColor $color
 */
#[Fillable(['flight_date', 'color', 'user_id'])]
class FinalDecision extends Model
{
    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'color' => VoteColor::class,
        ];
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
