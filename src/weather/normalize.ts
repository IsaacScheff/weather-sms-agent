import type { WeatherSnapshot } from '../agent/types.js';

type OpenMeteoDaily = {
  time: string[];
  temperature_2m_max: number[];
  temperature_2m_min: number[];
  precipitation_probability_max: number[];
  windspeed_10m_max: number[];
  weathercode: number[];
};

type OpenMeteoResponse = {
  daily: OpenMeteoDaily;
  timezone: string;
};

const weatherCodeSummary: Record<number, string> = {
  0: 'Clear sky',
  1: 'Mostly clear',
  2: 'Partly cloudy',
  3: 'Overcast',
  45: 'Fog',
  48: 'Rime fog',
  51: 'Light drizzle',
  53: 'Drizzle',
  55: 'Dense drizzle',
  56: 'Freezing drizzle',
  57: 'Freezing drizzle',
  61: 'Light rain',
  63: 'Rain',
  65: 'Heavy rain',
  66: 'Freezing rain',
  67: 'Freezing rain',
  71: 'Light snow',
  73: 'Snow',
  75: 'Heavy snow',
  77: 'Snow grains',
  80: 'Rain showers',
  81: 'Rain showers',
  82: 'Heavy showers',
  85: 'Snow showers',
  86: 'Snow showers',
  95: 'Thunderstorm',
  96: 'Thunderstorm with hail',
  99: 'Thunderstorm with hail',
};

export function normalizeOpenMeteo(
  locationName: string,
  date: string,
  payload: OpenMeteoResponse,
): WeatherSnapshot {
  const index = payload.daily.time.findIndex((item) => item === date);
  if (index === -1) {
    throw new Error(`No forecast for date ${date}`);
  }

  const tempHigh = payload.daily.temperature_2m_max[index];
  const tempLow = payload.daily.temperature_2m_min[index];
  const precip = payload.daily.precipitation_probability_max[index];
  const wind = payload.daily.windspeed_10m_max[index];
  const code = payload.daily.weathercode[index];

  return {
    location_name: locationName,
    date,
    temp_high_c: tempHigh,
    temp_low_c: tempLow,
    precip_prob: precip / 100,
    wind_kph: wind,
    condition_summary: weatherCodeSummary[code] ?? 'Unknown conditions',
  };
}
