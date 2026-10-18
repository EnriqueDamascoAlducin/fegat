export type WeatherNow = {
    time: string;
    temperature: number | null;
    weather_code: number;
    is_day: boolean;
    /** km/h a 10 m del suelo. */
    wind_speed: number | null;
    /** Grados desde donde sopla el viento (0 = norte). */
    wind_direction: number;
    wind_gusts: number | null;
    visibility_km: number | null;
    cloud_cover: number;
};

export type WeatherHour = Omit<WeatherNow, 'time'> & {
    time: string;
    /** km/h a 120 m, la altura a la que suben los globos al despegar. */
    wind_speed_120m: number | null;
    precipitation_probability: number | null;
};

export type WeatherData = {
    current: WeatherNow;
    flight_date: string;
    sunrise: string | null;
    hours: WeatherHour[];
};
