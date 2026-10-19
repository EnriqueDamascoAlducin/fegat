<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Carbon;

/**
 * Cuántos visitantes había activos en un momento (uno cada 5 minutos).
 *
 * @property Carbon $captured_at
 * @property int $active_count
 * @property int $mobile_count
 * @property int $tablet_count
 * @property int $desktop_count
 */
class SiteVisitorSnapshot extends Model
{
    public $timestamps = false;

    protected $guarded = [];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'captured_at' => 'datetime',
            'active_count' => 'integer',
            'mobile_count' => 'integer',
            'tablet_count' => 'integer',
            'desktop_count' => 'integer',
        ];
    }
}
