import { fetchJson } from '../../utils/http.js';
import type { Location } from '../types.js';

type GeocodeResponse = {
  results?: Array<{
    name: string;
    latitude: number;
    longitude: number;
    country?: string;
    admin1?: string;
  }>;
};

const cache = new Map<string, Location>();

export async function resolveLocation(
  locationText: string,
): Promise<Location> {
  const key = locationText.trim().toLowerCase();
  if (cache.has(key)) {
    return cache.get(key)!;
  }

  const url = new URL('https://geocoding-api.open-meteo.com/v1/search');
  url.searchParams.set('name', locationText);
  url.searchParams.set('count', '1');
  url.searchParams.set('language', 'en');
  url.searchParams.set('format', 'json');

  const payload = await fetchJson<GeocodeResponse>(url.toString(), { timeoutMs: 8000, retry: 1 });
  if (!payload.results || payload.results.length === 0) {
    throw new Error(`No geocoding result for ${locationText}`);
  }

  const result = payload.results[0];
  const nameParts = [result.name, result.admin1, result.country].filter(Boolean);
  const location: Location = {
    name: nameParts.join(', '),
    latitude: result.latitude,
    longitude: result.longitude,
  };
  cache.set(key, location);
  return location;
}
