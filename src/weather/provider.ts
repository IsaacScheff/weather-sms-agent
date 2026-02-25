import type { Location, WeatherSnapshot } from '../agent/types.js';

export interface WeatherProvider {
  getForecast(_location: Location, _date: string): Promise<WeatherSnapshot>;
  name: string;
}
