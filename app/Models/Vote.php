<?php

namespace App\Models;

use App\Enums\VoteColor;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * @property string $flight_date Fecha de vuelo en formato Y-m-d.
 * @property VoteColor $color
 */
#[Fillable(['company_id', 'flight_date', 'color', 'user_id'])]
class Vote extends Model
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
     * @return BelongsTo<Company, $this>
     */
    public function company(): BelongsTo
    {
        return $this->belongsTo(Company::class);
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * @return HasMany<VoteChange, $this>
     */
    public function changes(): HasMany
    {
        return $this->hasMany(VoteChange::class);
    }
}
