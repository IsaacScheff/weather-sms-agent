import pino from 'pino';
import { hashValue } from './ids.js';

export type Logger = ReturnType<typeof createLogger>;

const base = pino({
  level: process.env.LOG_LEVEL ?? 'info',
  messageKey: 'message',
});

export function createLogger(context?: Record<string, unknown>) {
  return context ? base.child(context) : base;
}

export function redactPhone(phone?: string | null): string | undefined {
  if (!phone) return undefined;
  const trimmed = phone.trim();
  if (trimmed.length <= 4) return '***';
  return `${'*'.repeat(Math.max(0, trimmed.length - 4))}${trimmed.slice(-4)}`;
}

export function hashPhone(phone?: string | null): string | undefined {
  if (!phone) return undefined;
  return hashValue(phone);
}
