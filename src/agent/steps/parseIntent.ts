import { addDays, toDateString } from '../../utils/time.js';
import type { Intent } from '../types.js';

const activities = ['hike', 'run', 'work', 'walk', 'picnic', 'bike', 'commute'];

export function parseIntent(body: string, now: Date = new Date()): Intent {
  const normalized = body.trim();
  const lower = normalized.toLowerCase();

  let date = toDateString(now);
  if (lower.includes('tomorrow')) {
    date = toDateString(addDays(now, 1));
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
