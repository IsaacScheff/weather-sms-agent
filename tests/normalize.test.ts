import { describe, expect, it } from 'vitest';
import { normalizeOpenMeteo } from '../src/weather/normalize.js';

describe('normalizeOpenMeteo', () => {
  it('maps response to snapshot', () => {
    const payload = {
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

    const snapshot = normalizeOpenMeteo('Test City', '2026-02-25', payload);
    expect(snapshot.location_name).toBe('Test City');
    expect(snapshot.temp_high_c).toBe(10);
    expect(snapshot.precip_prob).toBeCloseTo(0.7);
  });
});
