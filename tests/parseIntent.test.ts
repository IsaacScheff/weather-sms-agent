import { describe, expect, it } from 'vitest';
import { parseIntent } from '../src/agent/steps/parseIntent.js';

describe('parseIntent', () => {
  it('extracts tomorrow date and location', () => {
    const now = new Date('2026-02-25T08:00:00Z');
    const intent = parseIntent('Weather in Brooklyn tomorrow?', now);
    expect(intent.date).toBe('2026-02-26');
    expect(intent.locationText?.toLowerCase()).toContain('brooklyn');
  });

  it('extracts activity', () => {
    const now = new Date('2026-02-25T08:00:00Z');
    const intent = parseIntent('I want to run today', now);
    expect(intent.activity).toBe('run');
  });
});
