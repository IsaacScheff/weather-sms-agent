import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { runAgent } from '../src/agent/orchestrator.js';
import { MemoryTraceStore } from '../src/trace/memoryStore.js';
import type { Location, WeatherSnapshot } from '../src/agent/types.js';
import type { WeatherProvider } from '../src/weather/provider.js';

class StubProvider implements WeatherProvider {
  name = 'stub';

  async getForecast(location: Location, date: string): Promise<WeatherSnapshot> {
    return {
      location_name: location.name,
      date,
      temp_high_c: 20,
      temp_low_c: 10,
      precip_prob: 0.1,
      wind_kph: 5,
      condition_summary: 'Clear',
    };
  }
}

const originalFetch = globalThis.fetch;

beforeAll(() => {
  globalThis.fetch = (async (input: RequestInfo | URL) => {
    const url = new URL(input.toString());
    if (url.hostname === 'geocoding-api.open-meteo.com') {
      const name = url.searchParams.get('name') ?? '';
      if (name.toLowerCase().includes('seattle')) {
        return {
          ok: true,
          status: 200,
          async json() {
            return {
              results: [
                {
                  name: 'Seattle',
                  latitude: 47.61,
                  longitude: -122.33,
                  country: 'US',
                  admin1: 'WA',
                },
              ],
            };
          },
        } as unknown as Response;
      }
      if (name.toLowerCase().includes('new york')) {
        return {
          ok: true,
          status: 200,
          async json() {
            return {
              results: [
                {
                  name: 'New York',
                  latitude: 40.7,
                  longitude: -74.0,
                  country: 'US',
                  admin1: 'NY',
                },
              ],
            };
          },
        } as unknown as Response;
      }
      return {
        ok: true,
        status: 200,
        async json() {
          return { results: [] };
        },
      } as unknown as Response;
    }
    throw new Error(`Unexpected fetch: ${url.toString()}`);
  }) as typeof fetch;
});

afterAll(() => {
  globalThis.fetch = originalFetch;
});

describe('conversation memory', () => {
  it('reuses last location for the same sender', async () => {
    process.env.DEFAULT_LOCATION = 'New York, NY';
    const traceStore = new MemoryTraceStore();
    const provider = new StubProvider();
    const sender = '+15555550123';

    const first = await runAgent(
      {
        from: sender,
        body: 'Weather in Seattle today?',
        messageSid: 'MEM_1',
        receivedAt: new Date('2026-02-25T10:00:00Z').toISOString(),
      },
      {
        traceStore,
        weatherProvider: provider,
        includeRefId: false,
        defaultLocation: 'New York, NY',
        maxInputChars: 400,
      },
    );

    const stored = await traceStore.getConversationState(sender);
    expect(stored?.last_location?.name).toContain('Seattle');
    expect(first.output.weather?.location_name).toContain('Seattle');

    const second = await runAgent(
      {
        from: sender,
        body: 'What about tomorrow?',
        messageSid: 'MEM_2',
        receivedAt: new Date('2026-02-25T10:05:00Z').toISOString(),
      },
      {
        traceStore,
        weatherProvider: provider,
        includeRefId: false,
        defaultLocation: 'New York, NY',
        maxInputChars: 400,
      },
    );

    expect(second.output.weather?.location_name).toContain('Seattle');
  });
});
