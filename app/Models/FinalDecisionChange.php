<?php

namespace App\Models;

use App\Enums\VoteColor;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;

/**
 * @property string $flight_date Fecha de vuelo en formato Y-m-d.
 * @property VoteColor|null $from_color
 * @property VoteColor|null $to_color Vacío cuando la decisión se retiró.
 */
#[Fillable(['flight_date', 'user_id', 'user_name', 'from_color', 'to_color'])]
class FinalDecisionChange extends Model
{
    const UPDATED_AT = null;

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'from_color' => VoteColor::class,
            'to_color' => VoteColor::class,
        ];
    }
}
