import fs from 'node:fs/promises';
import { fetchJson } from '../../utils/http.js';
import { loadConfig } from '../../utils/config.js';
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
let fixtureLocationsCache: Record<string, FixtureLocation> | null = null;

type FixtureLocation = {
  name: string;
  lat: number;
  lon: number;
  tz?: string;
};

const aliasMap: Record<string, string> = {
  nyc: 'New York, NY',
  'new york city': 'New York, NY',
  sf: 'San Francisco, CA',
  'san fran': 'San Francisco, CA',
  la: 'Los Angeles, CA',
  'los angeles': 'Los Angeles, CA',
  dc: 'Washington, DC',
  'washington dc': 'Washington, DC',
};

function normalizeKey(text: string): string {
  return text.trim().toLowerCase();
}

function sanitizeLocationText(raw: string): string {
  let text = raw.trim();
  if (!text) return text;

  text = text.split(/[\u2014\u2013\-:]/)[0].trim();
  text = text.replace(/[?!.]/g, ' ');
  text = text.replace(/\b(today|tomorrow|tonight)\b.*$/i, '').trim();
  text = text.replace(/\b(what\s+should\s+i\s+(wear|do|bring)|do\s+i\s+need\s+a\s+coat)\b.*$/i, '').trim();
  text = text.replace(/\b(rain|snow|forecast|weather)\b.*$/i, '').trim();
  text = text.split(/\band\b/i)[0].trim();
  text = text.replace(/\s+/g, ' ').trim();

  return text;
}

async function loadLocationFixtures(): Promise<Record<string, FixtureLocation>> {
  if (fixtureLocationsCache) return fixtureLocationsCache;
  const fileUrl = new URL('../../../evals/fixtures/locations.json', import.meta.url);
  const raw = await fs.readFile(fileUrl, 'utf8');
  const parsed = JSON.parse(raw) as Record<string, FixtureLocation>;
  const normalized: Record<string, FixtureLocation> = {};
  for (const [key, value] of Object.entries(parsed)) {
    normalized[normalizeKey(key)] = value;
  }
  fixtureLocationsCache = normalized;
  return normalized;
}

async function geocode(name: string): Promise<Location | undefined> {
  const url = new URL('https://geocoding-api.open-meteo.com/v1/search');
  url.searchParams.set('name', name);
  url.searchParams.set('count', '1');
  url.searchParams.set('language', 'en');
  url.searchParams.set('format', 'json');

  const payload = await fetchJson<GeocodeResponse>(url.toString(), { timeoutMs: 8000, retry: 1 });
  if (!payload.results || payload.results.length === 0) {
    return undefined;
  }

  const result = payload.results[0];
  const nameParts = [result.name, result.admin1, result.country].filter(Boolean);
  return {
    name: nameParts.join(', '),
    latitude: result.latitude,
    longitude: result.longitude,
  };
}

export async function resolveLocation(
  locationText: string,
): Promise<Location> {
  const evalMode = process.env.EVAL_MODE ?? 'live';
  if (evalMode === 'fixture') {
    const raw = locationText.trim();
    const sanitized = sanitizeLocationText(raw);
    const fixtures = await loadLocationFixtures();
    const candidates = [sanitized, raw].filter((value) => value && value.trim().length > 0);
    for (const candidate of candidates) {
      const fixture = fixtures[normalizeKey(candidate)];
      if (fixture) {
        return {
          name: fixture.name,
          latitude: fixture.lat,
          longitude: fixture.lon,
        };
      }
    }
    throw new Error(
      `Missing location fixture for "${locationText}". Add it to evals/fixtures/locations.json.`,
    );
  }
  if (evalMode !== 'live') {
    throw new Error(`Unsupported EVAL_MODE: ${evalMode}`);
  }

  const key = normalizeKey(locationText);
  if (cache.has(key)) {
    return cache.get(key)!;
  }

  const raw = locationText.trim();
  const sanitized = sanitizeLocationText(raw);
  const alias = aliasMap[normalizeKey(sanitized)] ?? aliasMap[normalizeKey(raw)];
  const primary = alias ?? (sanitized || raw);

  const candidates = [primary];
  if (raw && raw !== primary) candidates.push(raw);
  if (sanitized && sanitized !== primary && sanitized !== raw) candidates.push(sanitized);

  let location: Location | undefined;
  for (const candidate of candidates) {
    location = await geocode(candidate);
    if (location) break;
  }

  if (!location) {
    const fallback = loadConfig().DEFAULT_LOCATION;
    if (fallback && normalizeKey(fallback) !== normalizeKey(primary)) {
      location = await geocode(fallback);
    }
  }

  if (!location) {
    throw new Error(`No geocoding result for ${locationText}`);
  }

  cache.set(key, location);
  return location;
}
