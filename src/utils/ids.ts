import crypto from 'node:crypto';

export function makeId(prefix: string): string {
  const bytes = crypto.randomBytes(8).toString('hex');
  return `${prefix}_${bytes}`;
}

export function hashValue(value: string): string {
  return crypto.createHash('sha256').update(value).digest('hex');
}
