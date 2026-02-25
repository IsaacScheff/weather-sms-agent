import Fastify from 'fastify';
import formbody from '@fastify/formbody';
import { describe, expect, it, beforeAll, afterAll } from 'vitest';
import { registerRoutes } from '../src/server/routes.js';
import { MemoryTraceStore } from '../src/trace/memoryStore.js';

const originalFetch = globalThis.fetch;

beforeAll(() => {
  globalThis.fetch = (async (input: RequestInfo | URL) => {
    const url = input.toString();
    if (url.includes('geocoding-api.open-meteo.com')) {
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

    if (url.includes('api.open-meteo.com')) {
      return {
        ok: true,
        status: 200,
        async json() {
          return {
            daily: {
              time: ['2026-02-25'],
              temperature_2m_max: [10],
              temperature_2m_min: [2],
              precipitation_probability_max: [70],
              windspeed_10m_max: [20],
              weathercode: [61],
            },
            timezone: 'UTC',
          };
        },
      } as unknown as Response;
    }

    throw new Error(`Unexpected fetch: ${url}`);
  }) as typeof fetch;
});

afterAll(() => {
  globalThis.fetch = originalFetch;
});

describe('twilio webhook', () => {
  it('handles idempotency', async () => {
    process.env.DEFAULT_LOCATION = 'New York, NY';
    process.env.FEATURE_INCLUDE_REF_ID = 'false';
    process.env.MAX_INPUT_CHARS = '400';

    const app = Fastify();
    await app.register(formbody);
    await registerRoutes(app, new MemoryTraceStore());

    const payload = {
      From: '+15555550123',
      Body: 'Weather today?',
      MessageSid: 'SM123',
    };

    const first = await app.inject({
      method: 'POST',
      url: '/webhooks/twilio/sms',
      payload,
    });

    const second = await app.inject({
      method: 'POST',
      url: '/webhooks/twilio/sms',
      payload,
    });

    expect(first.statusCode).toBe(200);
    expect(second.statusCode).toBe(200);
    expect(second.body).toBe(first.body);
  });
});
