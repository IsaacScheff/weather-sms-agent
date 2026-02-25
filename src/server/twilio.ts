import crypto from 'node:crypto';
import { z } from 'zod';

export const twilioWebhookSchema = z.object({
  From: z.string().nullable().optional(),
  Body: z.string().min(1),
  MessageSid: z.string().min(1),
});

export type TwilioWebhook = z.infer<typeof twilioWebhookSchema>;

export function verifyTwilioSignature(options: {
  authToken: string;
  url: string;
  params: Record<string, string>;
  signature: string;
}): boolean {
  const { authToken, url, params, signature } = options;
  const sortedKeys = Object.keys(params).sort();
  const data = `${url}${sortedKeys.map((key) => key + params[key]).join('')}`;
  const digest = crypto.createHmac('sha1', authToken).update(data).digest('base64');
  return timingSafeEqual(digest, signature);
}

function timingSafeEqual(a: string, b: string): boolean {
  const aBuffer = Buffer.from(a);
  const bBuffer = Buffer.from(b);
  if (aBuffer.length !== bBuffer.length) return false;
  return crypto.timingSafeEqual(aBuffer, bBuffer);
}

export function buildTwiML(message: string): string {
  return `<?xml version="1.0" encoding="UTF-8"?>\n<Response><Message>${escapeXml(
    message,
  )}</Message></Response>`;
}

function escapeXml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}
