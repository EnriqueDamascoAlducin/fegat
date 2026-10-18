<?php

namespace App\Services;

use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Throwable;

/**
 * Clima de la zona de vuelo según Open-Meteo (gratuito, sin clave, con atribución).
 */
class Weather
{
    private const URL = 'https://api.open-meteo.com/v1/forecast';

    private const CACHE_KEY = 'weather.forecast';

    private const HOURLY = [
        'temperature_2m', 'weather_code', 'is_day', 'wind_speed_10m', 'wind_speed_120m',
        'wind_direction_10m', 'wind_gusts_10m', 'precipitation_probability', 'visibility', 'cloud_cover',
    ];

    private const CURRENT = [
        'temperature_2m', 'weather_code', 'is_day', 'wind_speed_10m', 'wind_direction_10m',
        'wind_gusts_10m', 'visibility', 'cloud_cover',
    ];

    /**
     * Condiciones actuales y pronóstico por hora de la mañana de la jornada.
     * Devuelve null si Open-Meteo no responde, para que la página siga funcionando.
     *
     * @return array{current: array<string, mixed>, flight_date: string, sunrise: string|null, hours: list<array<string, mixed>>}|null
     */
    public function forecast(string $flightDate): ?array
    {
        $data = $this->fetch();

        if ($data === null) {
            return null;
        }

        [$from, $to] = config('fegat.weather.morning_hours');

        // Pasada la mañana de la jornada, lo útil es el pronóstico de la siguiente.
        if ($flightDate === now()->toDateString() && now()->hour > $to) {
            $flightDate = now()->addDay()->toDateString();
        }

        $hourly = $data['hourly'];
        $hours = [];

        foreach ($hourly['time'] as $index => $time) {
            $hour = (int) substr($time, 11, 2);

            if (! str_starts_with($time, $flightDate) || $hour < $from || $hour > $to) {
                continue;
            }

            $hours[] = [
                'time' => substr($time, 11, 5),
                'temperature' => $this->round($hourly['temperature_2m'][$index]),
                'weather_code' => $hourly['weather_code'][$index],
                'is_day' => (bool) $hourly['is_day'][$index],
                'wind_speed' => $this->round($hourly['wind_speed_10m'][$index]),
                'wind_speed_120m' => $this->round($hourly['wind_speed_120m'][$index]),
                'wind_direction' => $hourly['wind_direction_10m'][$index],
                'wind_gusts' => $this->round($hourly['wind_gusts_10m'][$index]),
                'precipitation_probability' => $hourly['precipitation_probability'][$index],
                'visibility_km' => $this->kilometers($hourly['visibility'][$index]),
                'cloud_cover' => $hourly['cloud_cover'][$index],
            ];
        }

        $day = array_search($flightDate, $data['daily']['time'], true);
        $current = $data['current'];

        return [
            'current' => [
                'time' => substr($current['time'], 11, 5),
                'temperature' => $this->round($current['temperature_2m']),
                'weather_code' => $current['weather_code'],
                'is_day' => (bool) $current['is_day'],
                'wind_speed' => $this->round($current['wind_speed_10m']),
                'wind_direction' => $current['wind_direction_10m'],
                'wind_gusts' => $this->round($current['wind_gusts_10m']),
                'visibility_km' => $this->kilometers($current['visibility']),
                'cloud_cover' => $current['cloud_cover'],
            ],
            'flight_date' => $flightDate,
            'sunrise' => $day === false ? null : substr($data['daily']['sunrise'][$day], 11, 5),
            'hours' => $hours,
        ];
    }

    /**
     * Respuesta cruda, en caché para no consultar Open-Meteo en cada visita.
     * Un fallo se recuerda unos minutos para no hacer esperar a cada visitante.
     *
     * @return array<string, mixed>|null
     */
    private function fetch(): ?array
    {
        $cached = Cache::get(self::CACHE_KEY);

        if ($cached !== null) {
            return $cached ?: null;
        }

        try {
            $data = Http::timeout(5)->get(self::URL, [
                'latitude' => config('fegat.weather.latitude'),
                'longitude' => config('fegat.weather.longitude'),
                'timezone' => config('app.timezone'),
                'wind_speed_unit' => 'kmh',
                'forecast_days' => 2,
                'current' => implode(',', self::CURRENT),
                'hourly' => implode(',', self::HOURLY),
                'daily' => 'sunrise',
            ])->throw()->json();
        } catch (Throwable $exception) {
            Log::warning('No se pudo obtener el clima de Open-Meteo.', ['error' => $exception->getMessage()]);
            Cache::put(self::CACHE_KEY, [], now()->addMinutes(2));

            return null;
        }

        Cache::put(self::CACHE_KEY, $data, now()->addMinutes(config('fegat.weather.cache_minutes')));

        return $data;
    }

    private function round(int|float|null $value): ?int
    {
        return $value === null ? null : (int) round($value);
    }

    private function kilometers(int|float|null $meters): ?float
    {
        return $meters === null ? null : round($meters / 1000, 1);
    }
}
