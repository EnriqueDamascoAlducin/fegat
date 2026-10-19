<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Carbon;

/**
 * Navegador que está (o estuvo hace poco) en el sitio público. Lo escribe el latido.
 *
 * @property string $visitor_token
 * @property string|null $country_code
 * @property string|null $device_type
 * @property string|null $os
 * @property string|null $browser
 * @property string|null $in_app
 * @property int|null $screen_width
 * @property string $path
 * @property string|null $page_title
 * @property string|null $landing_path
 * @property string|null $referrer_host
 * @property string|null $utm_source
 * @property string|null $utm_medium
 * @property string|null $utm_campaign
 * @property string|null $paid_click
 * @property int $page_views
 * @property Carbon|null $first_seen_at
 * @property Carbon|null $last_seen_at
 */
class SiteLiveVisitor extends Model
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
            'page_views' => 'integer',
            'screen_width' => 'integer',
            'first_seen_at' => 'datetime',
            'last_seen_at' => 'datetime',
        ];
    }

    /**
     * Visitantes que latieron dentro de la ventana de actividad.
     *
     * @param  Builder<SiteLiveVisitor>  $query
     */
    public function scopeActive(Builder $query): void
    {
        $query->where('last_seen_at', '>=', now()->subSeconds((int) config('live_visitors.active_seconds', 90)));
    }

    public function source(): string
    {
        return $this->utm_source ?: ($this->referrer_host ?: 'Directo');
    }
}
