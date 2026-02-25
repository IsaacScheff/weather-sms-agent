import type { Location, WeatherSnapshot } from '../agent/types.js';
import { fetchJson } from '../utils/http.js';
import { normalizeOpenMeteo } from './normalize.js';
import type { WeatherProvider } from './provider.js';

export class OpenMeteoProvider implements WeatherProvider {
  name = 'open-meteo';

  async getForecast(location: Location, date: string): Promise<WeatherSnapshot> {
    const url = new URL('https://api.open-meteo.com/v1/forecast');
    url.searchParams.set('latitude', location.latitude.toString());
    url.searchParams.set('longitude', location.longitude.toString());
    url.searchParams.set(
      'daily',
      'temperature_2m_max,temperature_2m_min,precipitation_probability_max,windspeed_10m_max,weathercode',
    );
    url.searchParams.set('timezone', 'auto');

    const payload = await fetchJson<any>(url.toString(), { timeoutMs: 8000, retry: 1 });
    return normalizeOpenMeteo(location.name, date, payload);
  }
}
