<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Carbon;

/**
 * Una visita al sitio público (histórico del reporte). La archiva site:visitors-snapshot.
 *
 * @property string $visitor_token
 * @property Carbon|null $started_at
 * @property Carbon|null $ended_at
 * @property int $duration_seconds
 * @property string|null $country_code
 * @property string|null $device_type
 * @property string|null $os
 * @property string|null $browser
 * @property string|null $referrer_host
 * @property string|null $utm_source
 * @property string|null $paid_click
 * @property string|null $landing_path
 * @property string|null $exit_path
 * @property int $page_views
 */
class SiteVisit extends Model
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
            'started_at' => 'datetime',
            'ended_at' => 'datetime',
            'duration_seconds' => 'integer',
            'page_views' => 'integer',
            'screen_width' => 'integer',
        ];
    }
}
