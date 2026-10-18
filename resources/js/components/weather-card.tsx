import {
    ArrowUp,
    Cloud,
    CloudDrizzle,
    CloudFog,
    CloudLightning,
    CloudMoon,
    CloudRain,
    CloudSun,
    Droplets,
    Eye,
    Moon,
    Snowflake,
    Sun,
    Sunrise,
    Wind,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { formatFlightDate } from '@/lib/semaphore';
import { cn } from '@/lib/utils';
import type { WeatherData } from '@/types';

/** Códigos WMO que usa Open-Meteo. */
function describeCode(
    code: number,
    isDay: boolean,
): { label: string; icon: LucideIcon } {
    if (code === 0) {
        return { label: 'Despejado', icon: isDay ? Sun : Moon };
    }

    if (code <= 2) {
        return {
            label: code === 1 ? 'Mayormente despejado' : 'Parcialmente nublado',
            icon: isDay ? CloudSun : CloudMoon,
        };
    }

    if (code === 3) {
        return { label: 'Nublado', icon: Cloud };
    }

    if (code <= 48) {
        return { label: 'Niebla', icon: CloudFog };
    }

    if (code <= 57) {
        return { label: 'Llovizna', icon: CloudDrizzle };
    }

    if (code <= 67 || (code >= 80 && code <= 82)) {
        return { label: 'Lluvia', icon: CloudRain };
    }

    if (code <= 86) {
        return { label: 'Nieve', icon: Snowflake };
    }

    return { label: 'Tormenta', icon: CloudLightning };
}

const DIRECTIONS = ['N', 'NE', 'E', 'SE', 'S', 'SO', 'O', 'NO'];

function cardinal(degrees: number): string {
    return DIRECTIONS[Math.round(degrees / 45) % 8];
}

/** La flecha apunta hacia donde va el viento, no de donde viene. */
function WindArrow({ degrees }: { degrees: number }) {
    return (
        <ArrowUp
            aria-hidden="true"
            className="inline size-3.5"
            style={{ transform: `rotate(${degrees + 180}deg)` }}
        />
    );
}

function value(number: number | null, unit: string): string {
    return number === null ? '—' : `${number} ${unit}`;
}

export default function WeatherCard({
    weather,
    tone = 'theme',
    className,
}: {
    weather: WeatherData | null;
    /** `light` es la versión del sitio público, que ignora el modo oscuro. */
    tone?: 'theme' | 'light';
    className?: string;
}) {
    const isPublic = tone === 'light';
    const muted = isPublic ? 'text-neutral-500' : 'text-muted-foreground';
    const frame = isPublic
        ? 'border-y-4 border-brand-soft bg-white text-neutral-900'
        : 'rounded-2xl border bg-card text-card-foreground';

    if (!weather) {
        return (
            <div className={cn(frame, 'p-6 text-sm', muted, className)}>
                El pronóstico del clima no está disponible en este momento.
            </div>
        );
    }

    const { current } = weather;
    const now = describeCode(current.weather_code, current.is_day);

    return (
        <div className={cn(frame, 'p-6 sm:p-8', className)}>
            <div className="grid gap-6 md:grid-cols-[auto_1fr] md:items-center md:gap-10">
                <div className="flex items-center gap-4">
                    <now.icon
                        aria-hidden="true"
                        className={cn(
                            'size-12 shrink-0',
                            isPublic ? 'text-brand' : 'text-primary',
                        )}
                    />
                    <div>
                        <p className="text-4xl font-semibold">
                            {value(current.temperature, '°C')}
                        </p>
                        <p className={cn('text-sm', muted)}>
                            {now.label} · ahora ({current.time})
                        </p>
                    </div>
                </div>

                <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm sm:grid-cols-4">
                    <div>
                        <dt className={cn('flex items-center gap-1', muted)}>
                            <Wind aria-hidden="true" className="size-3.5" />
                            Viento
                        </dt>
                        <dd className="font-medium">
                            {value(current.wind_speed, 'km/h')}{' '}
                            {cardinal(current.wind_direction)}{' '}
                            <WindArrow degrees={current.wind_direction} />
                        </dd>
                    </div>
                    <div>
                        <dt className={cn('flex items-center gap-1', muted)}>
                            <Wind aria-hidden="true" className="size-3.5" />
                            Ráfagas
                        </dt>
                        <dd className="font-medium">
                            {value(current.wind_gusts, 'km/h')}
                        </dd>
                    </div>
                    <div>
                        <dt className={cn('flex items-center gap-1', muted)}>
                            <Eye aria-hidden="true" className="size-3.5" />
                            Visibilidad
                        </dt>
                        <dd className="font-medium">
                            {value(current.visibility_km, 'km')}
                        </dd>
                    </div>
                    <div>
                        <dt className={cn('flex items-center gap-1', muted)}>
                            <Cloud aria-hidden="true" className="size-3.5" />
                            Nubosidad
                        </dt>
                        <dd className="font-medium">{current.cloud_cover} %</dd>
                    </div>
                </dl>
            </div>

            {weather.hours.length > 0 && (
                <div className="mt-6">
                    <p className="flex flex-wrap items-center gap-x-3 font-medium">
                        <span>
                            Pronóstico de la mañana del{' '}
                            {formatFlightDate(weather.flight_date)}
                        </span>
                        {weather.sunrise && (
                            <span
                                className={cn(
                                    'flex items-center gap-1 text-sm font-normal',
                                    muted,
                                )}
                            >
                                <Sunrise
                                    aria-hidden="true"
                                    className="size-4"
                                />
                                Amanece {weather.sunrise}
                            </span>
                        )}
                    </p>

                    <div className="mt-3 overflow-x-auto">
                        <table className="w-full min-w-[560px] text-left text-sm">
                            <thead className={muted}>
                                <tr
                                    className={cn(
                                        'border-b',
                                        isPublic && 'border-neutral-200',
                                    )}
                                >
                                    <th className="py-2 pr-3 font-normal">
                                        Hora
                                    </th>
                                    <th className="py-2 pr-3 font-normal">
                                        Cielo
                                    </th>
                                    <th className="py-2 pr-3 font-normal">
                                        Temp.
                                    </th>
                                    <th className="py-2 pr-3 font-normal">
                                        Viento
                                    </th>
                                    <th className="py-2 pr-3 font-normal">
                                        Viento 120 m
                                    </th>
                                    <th className="py-2 pr-3 font-normal">
                                        Ráfagas
                                    </th>
                                    <th className="py-2 font-normal">
                                        <Droplets
                                            aria-label="Probabilidad de lluvia"
                                            className="size-4"
                                        />
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {weather.hours.map((hour) => {
                                    const sky = describeCode(
                                        hour.weather_code,
                                        hour.is_day,
                                    );

                                    return (
                                        <tr
                                            key={hour.time}
                                            className={cn(
                                                'border-b last:border-0',
                                                isPublic &&
                                                    'border-neutral-100',
                                            )}
                                        >
                                            <td className="py-2 pr-3 font-medium">
                                                {hour.time}
                                            </td>
                                            <td className="py-2 pr-3">
                                                <span className="flex items-center gap-1.5">
                                                    <sky.icon
                                                        aria-hidden="true"
                                                        className="size-4 shrink-0"
                                                    />
                                                    {sky.label}
                                                </span>
                                            </td>
                                            <td className="py-2 pr-3">
                                                {value(hour.temperature, '°C')}
                                            </td>
                                            <td className="py-2 pr-3 whitespace-nowrap">
                                                {value(hour.wind_speed, 'km/h')}{' '}
                                                {cardinal(hour.wind_direction)}{' '}
                                                <WindArrow
                                                    degrees={
                                                        hour.wind_direction
                                                    }
                                                />
                                            </td>
                                            <td className="py-2 pr-3 whitespace-nowrap">
                                                {value(
                                                    hour.wind_speed_120m,
                                                    'km/h',
                                                )}
                                            </td>
                                            <td className="py-2 pr-3 whitespace-nowrap">
                                                {value(hour.wind_gusts, 'km/h')}
                                            </td>
                                            <td className="py-2">
                                                {value(
                                                    hour.precipitation_probability,
                                                    '%',
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            <p className={cn('mt-4 text-xs', muted)}>
                Pronóstico informativo; la decisión oficial es el semáforo.
                Datos:{' '}
                <a
                    href="https://open-meteo.com/"
                    target="_blank"
                    rel="noreferrer"
                    className="underline"
                >
                    Open-Meteo.com
                </a>
            </p>
        </div>
    );
}

export function WeatherCardSkeleton({
    tone = 'theme',
    className,
}: {
    tone?: 'theme' | 'light';
    className?: string;
}) {
    return (
        <div
            className={cn(
                'h-48 animate-pulse',
                tone === 'light'
                    ? 'border-y-4 border-brand-soft bg-neutral-100'
                    : 'rounded-2xl border bg-muted',
                className,
            )}
            aria-label="Cargando el clima"
        />
    );
}
