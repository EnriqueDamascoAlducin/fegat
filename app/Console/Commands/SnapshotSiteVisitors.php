<?php

namespace App\Console\Commands;

use App\Models\SiteLiveVisitor;
use App\Models\SiteVisit;
use App\Models\SiteVisitorSnapshot;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

/**
 * Port de store:visitors-snapshot de sav_3 (sin checkout ni compras).
 */
class SnapshotSiteVisitors extends Command
{
    /** Se re-archiva lo que latió en esta ventana: tolera un par de corridas perdidas. */
    private const ARCHIVE_WINDOW_MINUTES = 20;

    protected $signature = 'site:visitors-snapshot';

    protected $description = 'Guarda cuántos visitantes hay activos en el sitio, archiva las visitas y limpia los registros viejos';

    public function handle(): int
    {
        if (! config('live_visitors.enabled')) {
            $this->info('Visitantes en vivo está apagado.');

            return self::SUCCESS;
        }

        $active = SiteLiveVisitor::query()->active()->get(['device_type']);

        SiteVisitorSnapshot::query()->create([
            'captured_at' => now(),
            'active_count' => $active->count(),
            'mobile_count' => $active->where('device_type', 'mobile')->count(),
            'tablet_count' => $active->where('device_type', 'tablet')->count(),
            'desktop_count' => $active->where('device_type', 'desktop')->count(),
        ]);

        $this->archiveVisits();

        $visitsCutoff = now()->subDays((int) config('live_visitors.visits_retention_days', 400));

        SiteLiveVisitor::query()->where('last_seen_at', '<', now()->subHours((int) config('live_visitors.retention_hours', 48)))->delete();
        SiteVisitorSnapshot::query()->where('captured_at', '<', now()->subDays((int) config('live_visitors.snapshot_retention_days', 90)))->delete();
        SiteVisit::query()->where('started_at', '<', $visitsCutoff)->delete();
        DB::table('site_page_views')->where('viewed_at', '<', $visitsCutoff)->delete();

        $this->info("Visitantes activos: {$active->count()}.");

        return self::SUCCESS;
    }

    /**
     * Copia cada visita reciente al histórico. La fila en vivo se pisa cuando el
     * navegador vuelve, así que se va guardando mientras la visita sigue viva:
     * la llave (navegador, inicio) hace que cada corrida actualice la misma fila.
     */
    private function archiveVisits(): void
    {
        $rows = SiteLiveVisitor::query()
            ->where('last_seen_at', '>=', now()->subMinutes(self::ARCHIVE_WINDOW_MINUTES))
            ->whereNotNull('first_seen_at')
            ->get()
            ->map(fn (SiteLiveVisitor $visitor) => [
                'visitor_token' => $visitor->visitor_token,
                'started_at' => $visitor->first_seen_at,
                'ended_at' => $visitor->last_seen_at,
                'duration_seconds' => max(0, (int) $visitor->first_seen_at?->diffInSeconds($visitor->last_seen_at)),
                'country_code' => $visitor->country_code,
                'device_type' => $visitor->device_type,
                'os' => $visitor->os,
                'browser' => $visitor->browser,
                'in_app' => $visitor->in_app,
                'screen_width' => $visitor->screen_width,
                'landing_path' => $visitor->landing_path,
                'exit_path' => $visitor->path,
                'referrer_host' => $visitor->referrer_host,
                'utm_source' => $visitor->utm_source,
                'utm_medium' => $visitor->utm_medium,
                'utm_campaign' => $visitor->utm_campaign,
                'paid_click' => $visitor->paid_click,
                'page_views' => $visitor->page_views,
            ]);

        if ($rows->isEmpty()) {
            return;
        }

        // Todo menos la llave (navegador, inicio) se actualiza en cada corrida.
        $columns = array_values(array_diff(array_keys((array) $rows->first()), ['visitor_token', 'started_at']));

        foreach ($rows->chunk(200) as $chunk) {
            SiteVisit::query()->upsert($chunk->values()->all(), ['visitor_token', 'started_at'], $columns);
        }
    }
}
