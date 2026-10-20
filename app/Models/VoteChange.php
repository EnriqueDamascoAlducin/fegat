<?php

namespace App\Models;

use App\Enums\VoteColor;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * @property string $flight_date Fecha de vuelo en formato Y-m-d.
 * @property VoteColor|null $from_color
 * @property VoteColor $to_color
 * @property string $channel «web» o «whatsapp».
 */
#[Fillable(['vote_id', 'company_id', 'flight_date', 'user_id', 'user_name', 'from_color', 'to_color', 'channel'])]
class VoteChange extends Model
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

    /**
     * @return BelongsTo<Company, $this>
     */
    public function company(): BelongsTo
    {
        return $this->belongsTo(Company::class);
    }
}
