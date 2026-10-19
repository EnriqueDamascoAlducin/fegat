<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\SiteLiveVisitor;
use App\Models\SiteVisitorSnapshot;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Visitantes en vivo del sitio público (port de LiveVisitorsController de sav_3).
 */
class LiveVisitorsController extends Controller
{
    /** Rangos del histórico (horas) que acepta el panel. */
    private const HISTORY_RANGES = [24, 72, 168, 720];

    /** Tope de filas en la lista; los contadores sí consideran a todos. */
    private const LIST_LIMIT = 200;

    public function index(Request $request): Response
    {
        $hours = (int) $request->query('hours', 24);
        $hours = in_array($hours, self::HISTORY_RANGES, true) ? $hours : 24;

        // Closures: el polling pide solo `live`, así que el histórico no se recalcula cada 15 s.
        return Inertia::render('admin/visitors/index', [
            'live' => fn () => $this->live(),
            'history' => fn () => $this->history($hours),
            'filters' => ['hours' => $hours],
            'settings' => [
                'enabled' => (bool) config('live_visitors.enabled'),
                'active_seconds' => (int) config('live_visitors.active_seconds'),
            ],
        ]);
    }

    /**
     * @return array<string, mixed>
     */
    private function live(): array
    {
        $active = SiteLiveVisitor::query()->active()->orderByDesc('last_seen_at')->get();

        return [
            'generated_at' => now()->toIso8601String(),
            'total' => $active->count(),
            'today' => SiteLiveVisitor::query()->where('first_seen_at', '>=', now()->startOfDay())->count(),
            'peak_today' => (int) max(
                $active->count(),
                SiteVisitorSnapshot::query()->where('captured_at', '>=', now()->startOfDay())->max('active_count') ?? 0,
            ),
            'by_page' => $this->breakdown($active, fn (SiteLiveVisitor $visitor) => $visitor->page_title ?: $visitor->path),
            'by_country' => $this->breakdown($active, fn (SiteLiveVisitor $visitor) => $visitor->country_code ?: 'Desconocido'),
            'by_device' => $this->breakdown($active, fn (SiteLiveVisitor $visitor) => $visitor->device_type ?: 'desconocido'),
            'by_source' => $this->breakdown($active, fn (SiteLiveVisitor $visitor) => $visitor->source()),
            'visitors' => $active->take(self::LIST_LIMIT)->map(fn (SiteLiveVisitor $visitor) => [
                'id' => $visitor->id,
                'label' => strtoupper(substr($visitor->visitor_token, 0, 6)),
                'country_code' => $visitor->country_code,
                'device_type' => $visitor->device_type,
                'path' => $visitor->path,
                'page_title' => $visitor->page_title,
                'landing_path' => $visitor->landing_path,
                'source' => $visitor->source(),
                'utm_campaign' => $visitor->utm_campaign,
                'page_views' => $visitor->page_views,
                'first_seen_at' => $visitor->first_seen_at?->toIso8601String(),
                'last_seen_at' => $visitor->last_seen_at?->toIso8601String(),
            ])->values(),
        ];
    }

    /**
     * @param  Collection<int, SiteLiveVisitor>  $active
     * @return array<int,array{name: string, total: int}>
     */
    private function breakdown(Collection $active, callable $key, int $limit = 8): array
    {
        return $active
            ->countBy($key)
            ->sortDesc()
            ->take($limit)
            ->map(fn (int $total, string $name) => ['name' => $name, 'total' => $total])
            ->values()
            ->all();
    }

    /**
     * Hasta 3 días se grafica cada snapshot (5 min); en rangos largos se agrupa por hora
     * con el pico y el promedio de esa hora.
     *
     * @return array<int,array{at: string, active: int, peak: int}>
     */
    private function history(int $hours): array
    {
        $snapshots = SiteVisitorSnapshot::query()
            ->where('captured_at', '>=', now()->subHours($hours))
            ->orderBy('captured_at')
            ->get(['captured_at', 'active_count']);

        if ($hours <= 72) {
            return $snapshots->map(fn (SiteVisitorSnapshot $snapshot) => [
                'at' => $snapshot->captured_at->toIso8601String(),
                'active' => $snapshot->active_count,
                'peak' => $snapshot->active_count,
            ])->values()->all();
        }

        return $snapshots
            ->groupBy(fn (SiteVisitorSnapshot $snapshot) => $snapshot->captured_at->format('Y-m-d H:00'))
            ->map(fn (Collection $group) => [
                'at' => $group->first()->captured_at->copy()->startOfHour()->toIso8601String(),
                'active' => (int) round($group->avg('active_count')),
                'peak' => (int) $group->max('active_count'),
            ])
            ->values()
            ->all();
    }
}
