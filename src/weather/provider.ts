import type { Location, WeatherSnapshot } from '../agent/types.js';

export interface WeatherProvider {
  getForecast(location: Location, date: string): Promise<WeatherSnapshot>;
  name: string;
}
