import type { Location, WeatherSnapshot } from '../types.js';
import type { WeatherProvider } from '../../weather/provider.js';

export type FetchWeatherOptions = {
  provider: WeatherProvider;
  date: string;
  location: Location;
  recordedWeather?: WeatherSnapshot;
  useRecorded?: boolean;
};

export async function fetchWeather(options: FetchWeatherOptions): Promise<WeatherSnapshot> {
  if (options.useRecorded && options.recordedWeather) {
    return options.recordedWeather;
  }
  return options.provider.getForecast(options.location, options.date);
}
