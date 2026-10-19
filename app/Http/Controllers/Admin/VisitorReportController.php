<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\SiteVisit;
use Carbon\CarbonImmutable;
use Carbon\CarbonPeriod;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Reporte de visitantes del sitio público (port de VisitorReportController de sav_3, sin
 * checkout ni ventas) más las páginas más vistas.
 */
class VisitorReportController extends Controller
{
    private const DEFAULT_DAYS = 30;

    private const MAX_DAYS = 400;

    /** Con menos visitas que estas un porcentaje no dice nada: no se compara. */
    private const MIN_SAMPLE = 30;

    private const METRICS = 'count(*) as visits, sum(page_views) as page_views, sum(duration_seconds) as duration, '
        .'sum(case when page_views <= 1 then 1 else 0 end) as bounces';

    private const SOURCE = "coalesce(nullif(utm_source, ''), nullif(referrer_host, ''), paid_click, 'Directo')";

    private const SCREEN = "case when screen_width is null then 'Sin dato' "
        ."when screen_width < 360 then 'Menos de 360 px' "
        ."when screen_width < 400 then '360 a 399 px' "
        ."when screen_width < 480 then '400 a 479 px' "
        ."when screen_width < 768 then '480 a 767 px' "
        ."when screen_width < 1024 then '768 a 1023 px' "
        ."when screen_width < 1280 then '1024 a 1279 px' "
        ."when screen_width < 1440 then '1280 a 1439 px' "
        ."when screen_width < 1920 then '1440 a 1919 px' "
        ."else '1920 px o más' end";

    /** Visitas que se listan al abrir el detalle de un renglón. */
    private const VISITS_LIMIT = 50;

    /**
     * Expresión con la que se agrupa cada tabla. El detalle de visitas recibe la llave
     * desde el request, así que solo se aceptan estas.
     */
    private const DIMENSIONS = [
        'devices' => "coalesce(device_type, 'desconocido')",
        'systems' => "coalesce(os, 'Sin dato')",
        'browsers' => "coalesce(browser, 'Sin dato')",
        'screens' => self::SCREEN,
        'in_app' => "coalesce(in_app, 'Navegador normal')",
        'sources' => self::SOURCE,
        'untagged_clicks' => 'paid_click',
        'landings' => "coalesce(landing_path, '/')",
        'countries' => "coalesce(country_code, 'Desconocido')",
    ];

    public function index(Request $request): Response
    {
        [$from, $to] = $this->range($request);

        $base = $this->base($from, $to);
        $devices = $this->breakdown($base, self::DIMENSIONS['devices']);
        $inApp = $this->breakdown($base, self::DIMENSIONS['in_app']);
        $screens = $this->breakdown($base, self::DIMENSIONS['screens']);
        $untagged = $this->breakdown($this->untagged($base), self::DIMENSIONS['untagged_clicks']);
        $summary = $this->summary($base);

        return Inertia::render('admin/visitors/report', [
            'filters' => ['from' => $from->toDateString(), 'to' => $to->toDateString()],
            'summary' => $summary,
            'daily' => $this->daily($base, $from, $to),
            'hours' => $this->hours($base),
            'pages' => $this->pages($from, $to),
            'devices' => $devices,
            'systems' => $this->breakdown($base, self::DIMENSIONS['systems']),
            'browsers' => $this->breakdown($base, self::DIMENSIONS['browsers']),
            'screens' => $screens,
            'in_app' => $inApp,
            'sources' => $this->breakdown($base, self::DIMENSIONS['sources'], 15),
            'campaigns' => $this->campaigns($base),
            'untagged_clicks' => $untagged,
            'landings' => $this->breakdown($base, self::DIMENSIONS['landings'], 20),
            'countries' => $this->breakdown($base, self::DIMENSIONS['countries']),
            'insights' => $this->insights($summary, $devices, $inApp, $screens, $untagged),
            'first_visit_at' => SiteVisit::query()->min('started_at'),
        ]);
    }

    /**
     * Las visitas de un renglón del reporte, con las páginas que vio cada una.
     */
    public function visits(Request $request): JsonResponse
    {
        $data = $request->validate([
            'dimension' => ['required', Rule::in([...array_keys(self::DIMENSIONS), 'campaigns', 'pages'])],
            'value' => ['required', 'string', 'max:500'],
            'source' => ['nullable', 'string', 'max:255'],
            'medium' => ['nullable', 'string', 'max:255'],
        ]);

        [$from, $to] = $this->range($request);
        $query = $this->base($from, $to);

        if ($data['dimension'] === 'campaigns') {
            $query->where('utm_campaign', $data['value']);

            foreach (['source', 'medium'] as $field) {
                isset($data[$field])
                    ? $query->where("utm_{$field}", $data[$field])
                    : $query->whereNull("utm_{$field}");
            }
        } elseif ($data['dimension'] === 'pages') {
            // Visitas de los navegadores que vieron esa página en el periodo.
            $query->whereIn('visitor_token', DB::table('site_page_views')
                ->where('path', $data['value'])
                ->whereBetween('viewed_at', [$from->startOfDay(), $to->endOfDay()])
                ->select('visitor_token'));
        } else {
            if ($data['dimension'] === 'untagged_clicks') {
                $query = $this->untagged($query);
            }

            $query->whereRaw(self::DIMENSIONS[$data['dimension']].' = ?', [$data['value']]);
        }

        $total = (clone $query)->count();
        $visits = $query->orderByDesc('started_at')->limit(self::VISITS_LIMIT)->get();

        return response()->json([
            'total' => $total,
            'visits' => $this->withPages($visits)->values(),
        ]);
    }

    /**
     * @return Builder<SiteVisit>
     */
    private function base(CarbonImmutable $from, CarbonImmutable $to): Builder
    {
        return SiteVisit::query()->whereBetween('started_at', [$from->startOfDay(), $to->endOfDay()]);
    }

    /**
     * Clics de anuncio que no traen UTM.
     *
     * @param  Builder<SiteVisit>  $base
     * @return Builder<SiteVisit>
     */
    private function untagged(Builder $base): Builder
    {
        return (clone $base)->whereNotNull('paid_click')->whereNull('utm_source');
    }

    /**
     * Páginas más vistas: vistas totales y navegadores distintos que las abrieron.
     *
     * @return array<int,array{name: string, title: string|null, views: int, visitors: int}>
     */
    private function pages(CarbonImmutable $from, CarbonImmutable $to): array
    {
        return DB::table('site_page_views')
            ->whereBetween('viewed_at', [$from->startOfDay(), $to->endOfDay()])
            ->selectRaw('path as name, max(title) as title, count(*) as views, count(distinct visitor_token) as visitors')
            ->groupBy('path')
            ->orderByDesc('views')
            ->limit(30)
            ->get()
            ->map(fn (\stdClass $row) => [
                'name' => (string) $row->name,
                'title' => $row->title,
                'views' => (int) $row->views,
                'visitors' => (int) $row->visitors,
            ])
            ->all();
    }

    /**
     * A cada visita le toca la página vista de su navegador desde que empezó hasta que
     * empezó la siguiente visita de ese mismo navegador.
     *
     * @param  Collection<int, SiteVisit>  $visits
     * @return Collection<int, mixed>
     */
    private function withPages(Collection $visits): Collection
    {
        if ($visits->isEmpty()) {
            return collect();
        }

        $tokens = $visits->pluck('visitor_token')->unique();
        $since = $visits->min('started_at');

        $views = DB::table('site_page_views')
            ->whereIn('visitor_token', $tokens)
            ->where('viewed_at', '>=', $since)
            ->orderBy('viewed_at')
            ->get(['visitor_token', 'path', 'title', 'viewed_at'])
            ->groupBy('visitor_token');

        // Inicio de todas las visitas de esos navegadores, para saber dónde termina cada una.
        $starts = SiteVisit::query()
            ->whereIn('visitor_token', $tokens)
            ->where('started_at', '>=', $since)
            ->orderBy('started_at')
            ->get(['visitor_token', 'started_at'])
            ->groupBy('visitor_token');

        return $visits->map(function (SiteVisit $visit) use ($views, $starts) {
            $next = $starts->get($visit->visitor_token, collect())
                ->first(fn (mixed $other) => $other instanceof SiteVisit && $other->started_at?->greaterThan($visit->started_at) === true)
                ?->started_at;

            $pages = $views->get($visit->visitor_token, collect())
                ->filter(function (\stdClass $view) use ($visit, $next) {
                    $at = CarbonImmutable::parse($view->viewed_at);

                    return $at->greaterThanOrEqualTo($visit->started_at) && (! $next || $at->lessThan($next));
                })
                ->map(fn (\stdClass $view) => [
                    'path' => $view->path,
                    'title' => $view->title,
                    'viewed_at' => CarbonImmutable::parse($view->viewed_at)->toIso8601String(),
                ])
                ->values();

            return [
                'id' => $visit->id,
                'started_at' => $visit->started_at?->toIso8601String(),
                'duration' => $visit->duration_seconds,
                'device' => $visit->device_type,
                'os' => $visit->os,
                'browser' => $visit->browser,
                'country' => $visit->country_code,
                'source' => $visit->utm_source ?: ($visit->referrer_host ?: $visit->paid_click),
                'page_views' => $visit->page_views,
                'landing_path' => $visit->landing_path,
                'exit_path' => $visit->exit_path,
                'pages' => $pages,
            ];
        });
    }

    /**
     * @return array{0: CarbonImmutable, 1: CarbonImmutable}
     */
    private function range(Request $request): array
    {
        $parse = function (mixed $value): ?CarbonImmutable {
            try {
                return is_string($value) && $value !== '' ? (CarbonImmutable::createFromFormat('Y-m-d', $value) ?: null) : null;
            } catch (\Throwable) {
                return null;
            }
        };

        $to = $parse($request->query('to')) ?? CarbonImmutable::today();
        $from = $parse($request->query('from')) ?? $to->subDays(self::DEFAULT_DAYS - 1);

        if ($from->greaterThan($to)) {
            [$from, $to] = [$to, $from];
        }

        if ($from->diffInDays($to) > self::MAX_DAYS) {
            $from = $to->subDays(self::MAX_DAYS);
        }

        return [$from, $to];
    }

    /**
     * @param  Builder<SiteVisit>  $base
     * @return array<string, int|float>
     */
    private function summary(Builder $base): array
    {
        $row = (clone $base)->toBase()
            ->selectRaw(self::METRICS.', count(distinct visitor_token) as visitors')
            ->first();

        return $this->metrics($row) + ['visitors' => (int) ($row->visitors ?? 0)];
    }

    /**
     * Visitas agrupadas por una expresión SQL fija (nunca viene del request).
     *
     * @param  Builder<SiteVisit>  $base
     * @param  literal-string  $expression
     * @return array<int,array<string, int|float|string>>
     */
    private function breakdown(Builder $base, string $expression, int $limit = 12): array
    {
        // La expresión se calcula en una subconsulta y se agrupa por su alias: con
        // ONLY_FULL_GROUP_BY, MySQL rechaza agrupar por la expresión cuando combina columnas.
        $rows = (clone $base)->toBase()->selectRaw("{$expression} as name, page_views, duration_seconds");

        return DB::query()
            ->fromSub($rows, 'visits_by_name')
            ->selectRaw('name, '.self::METRICS)
            ->groupBy('name')
            ->orderByDesc('visits')
            ->limit($limit)
            ->get()
            ->map(fn (\stdClass $row) => ['name' => (string) $row->name] + $this->metrics($row))
            ->values()
            ->all();
    }

    /**
     * @param  Builder<SiteVisit>  $base
     * @return array<int,array<string, int|float|string|null>>
     */
    private function campaigns(Builder $base): array
    {
        return (clone $base)->toBase()
            ->whereNotNull('utm_campaign')
            ->selectRaw('utm_campaign as name, utm_source as source, utm_medium as medium, '.self::METRICS)
            ->groupBy('utm_campaign', 'utm_source', 'utm_medium')
            ->orderByDesc('visits')
            ->limit(25)
            ->get()
            ->map(fn (\stdClass $row) => [
                'name' => (string) $row->name,
                'detail' => implode(' / ', array_filter([$row->source, $row->medium])) ?: null,
                'source' => $row->source,
                'medium' => $row->medium,
            ] + $this->metrics($row))
            ->values()
            ->all();
    }

    /**
     * @param  Builder<SiteVisit>  $base
     * @return array<int,array{day: string, visits: int, page_views: int}>
     */
    private function daily(Builder $base, CarbonImmutable $from, CarbonImmutable $to): array
    {
        $rows = (clone $base)->toBase()
            ->selectRaw('date(started_at) as day, count(*) as visits, sum(page_views) as page_views')
            ->groupByRaw('date(started_at)')
            ->get()
            ->keyBy('day');

        return collect(CarbonPeriod::create($from, $to)->toArray())
            ->map(fn ($day) => [
                'day' => $day->toDateString(),
                'visits' => (int) ($rows[$day->toDateString()]->visits ?? 0),
                'page_views' => (int) ($rows[$day->toDateString()]->page_views ?? 0),
            ])
            ->values()
            ->all();
    }

    /**
     * Visitas por hora del día en que empezaron (0–23).
     *
     * @param  Builder<SiteVisit>  $base
     * @return array<int,array{hour: int, visits: int}>
     */
    private function hours(Builder $base): array
    {
        $hour = DB::connection()->getDriverName() === 'sqlite'
            ? "cast(strftime('%H', started_at) as integer)"
            : 'hour(started_at)';

        $rows = (clone $base)->toBase()
            ->selectRaw("{$hour} as hour, count(*) as visits")
            ->groupByRaw($hour)
            ->pluck('visits', 'hour');

        return collect(range(0, 23))
            ->map(fn (int $value) => ['hour' => $value, 'visits' => (int) ($rows[$value] ?? 0)])
            ->values()
            ->all();
    }

    /**
     * @return array{visits: int, pages_per_visit: float, avg_duration: int, bounce_rate: float}
     */
    private function metrics(?\stdClass $row): array
    {
        $visits = (int) ($row->visits ?? 0);

        return [
            'visits' => $visits,
            'pages_per_visit' => $visits > 0 ? round((int) $row->page_views / $visits, 1) : 0.0,
            'avg_duration' => $visits > 0 ? (int) round((int) $row->duration / $visits) : 0,
            'bounce_rate' => $visits > 0 ? round((int) ($row->bounces ?? 0) / $visits * 100, 1) : 0.0,
        ];
    }

    /**
     * Lecturas en lenguaje llano de las tablas: a qué ponerle atención.
     *
     * @param  array<string, int|float>  $summary
     * @param  array<int,array<string, int|float|string>>  $devices
     * @param  array<int,array<string, int|float|string>>  $inApp
     * @param  array<int,array<string, int|float|string>>  $screens
     * @param  array<int,array<string, int|float|string>>  $untagged
     * @return array<int,array{tone: string, title: string, text: string}>
     */
    private function insights(array $summary, array $devices, array $inApp, array $screens, array $untagged): array
    {
        $total = (int) $summary['visits'];

        if ($total < self::MIN_SAMPLE) {
            return [];
        }

        $insights = [];
        $share = fn (array $row) => (int) round($row['visits'] / $total * 100);
        $labels = ['mobile' => 'celular', 'tablet' => 'tablet', 'desktop' => 'computadora'];

        if ($top = $devices[0] ?? null) {
            $screen = collect($screens)->first(fn (array $row) => $row['name'] !== 'Sin dato');

            $insights[] = [
                'tone' => 'info',
                'title' => $share($top).'% de las visitas llega desde '.($labels[(string) $top['name']] ?? $top['name']),
                'text' => 'Es el dispositivo para el que hay que diseñar y probar primero.'
                    .($screen ? ' El ancho de pantalla más común es '.$screen['name'].' ('.$share($screen).'% de las visitas).' : ''),
            ];
        }

        $bouncy = collect($devices)->filter(fn (array $row) => $row['visits'] >= self::MIN_SAMPLE)->sortByDesc('bounce_rate')->first();

        if ($bouncy && $bouncy['bounce_rate'] >= 70) {
            $insights[] = [
                'tone' => 'warning',
                'title' => 'En '.($labels[(string) $bouncy['name']] ?? $bouncy['name']).' '.$bouncy['bounce_rate'].'% se va tras ver una sola página',
                'text' => 'Revisa que la portada cargue rápido y que el menú y los botones se vean bien en ese dispositivo.',
            ];
        }

        $embedded = collect($inApp)->where('name', '!=', 'Navegador normal');
        $embeddedShare = (int) round($embedded->sum('visits') / $total * 100);

        if ($embeddedShare >= 10) {
            $insights[] = [
                'tone' => 'info',
                'title' => $embeddedShare.'% navega dentro de una app ('.$embedded->take(2)->pluck('name')->implode(', ').')',
                'text' => 'Esos navegadores embebidos bloquean ventanas emergentes y a veces el almacenamiento: prueba el sitio abriéndolo desde un enlace dentro de esas apps.',
            ];
        }

        if ($untaggedVisits = array_sum(array_column($untagged, 'visits'))) {
            $insights[] = [
                'tone' => 'warning',
                'title' => number_format($untaggedVisits).' visitas llegaron con clic de anuncio pero sin UTM',
                'text' => 'Se sabe de qué plataforma vienen, pero no de qué campaña. Agrega utm_source, utm_medium y utm_campaign a los enlaces para poder compararlas.',
            ];
        }

        return $insights;
    }
}
