import { addDays, toDateString } from '../../utils/time.js';
import type { Intent } from '../types.js';

const activities = ['hike', 'run', 'work', 'walk', 'picnic', 'bike', 'commute'];

function resolveNow(now?: Date): Date {
  if (now) return now;
  const fixed = process.env.EVAL_FIXED_DATE;
  if (fixed) {
    const parsed = new Date(fixed);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed;
    }
  }
  return new Date();
}

export function parseIntent(body: string, now?: Date): Intent {
  const reference = resolveNow(now);
  const normalized = body.trim();
  const lower = normalized.toLowerCase();

  let date = toDateString(reference);
  if (lower.includes('tomorrow')) {
    date = toDateString(addDays(reference, 1));
  }

  let activity: string | undefined;
  for (const candidate of activities) {
    if (lower.includes(candidate)) {
      activity = candidate;
      break;
    }
  }

  let locationText: string | undefined;
  const inMatch = lower.match(/\b(?:in|at)\s+([^?.,]+)(?:[?.,]|$)/i);
  if (inMatch) {
    const start = normalized.toLowerCase().indexOf(inMatch[1]);
    locationText = normalized.slice(start, start + inMatch[1].length).trim();
  } else {
    const weatherMatch = lower.match(/\bweather\s+(?:in\s+)?([^?.,]+)(?:[?.,]|$)/i);
    if (weatherMatch) {
      const start = normalized.toLowerCase().indexOf(weatherMatch[1]);
      locationText = normalized.slice(start, start + weatherMatch[1].length).trim();
    }
  }

  return {
    question: normalized,
    date,
    activity,
    locationText,
  };
}
