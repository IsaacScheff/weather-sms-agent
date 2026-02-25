import type { FastifyInstance } from 'fastify';
import { twilioWebhookSchema, verifyTwilioSignature, buildTwiML } from './twilio.js';
import type { TraceStore } from '../trace/store.js';
import { runAgent } from '../agent/orchestrator.js';
import { OpenMeteoProvider } from '../weather/openMeteoProvider.js';
import { loadConfig } from '../utils/config.js';
import { createLogger, hashPhone } from '../utils/logger.js';

const metrics = {
  requests: 0,
  errors: 0,
};

export async function registerRoutes(app: FastifyInstance, traceStore: TraceStore) {
  const config = loadConfig();
  const logger = createLogger();
  const provider = new OpenMeteoProvider();

  app.get('/healthz', async () => ({ ok: true }));

  app.get('/metrics', async () => ({
    requests: metrics.requests,
    errors: metrics.errors,
  }));

  app.post('/webhooks/twilio/sms', async (request, reply) => {
    metrics.requests += 1;
    const params = request.body as Record<string, string>;
    const signature = request.headers['x-twilio-signature'];

    if (config.TWILIO_AUTH_TOKEN) {
      if (typeof signature !== 'string') {
        metrics.errors += 1;
        reply.code(403).send('Missing signature');
        return;
      }

      const url = `${request.protocol}://${request.hostname}${request.raw.url}`;
      const verified = verifyTwilioSignature({
        authToken: config.TWILIO_AUTH_TOKEN,
        url,
        params,
        signature,
      });
      if (!verified) {
        metrics.errors += 1;
        reply.code(403).send('Invalid signature');
        return;
      }
    }

    const parsed = twilioWebhookSchema.safeParse(params);
    if (!parsed.success) {
      metrics.errors += 1;
      reply.code(400).send('Invalid payload');
      return;
    }

    const { Body, From, MessageSid } = parsed.data;
    const existing = await traceStore.getIdempotency(MessageSid);
    if (existing) {
      reply.type('text/xml').send(buildTwiML(existing.responseText));
      return;
    }

    const { output, trace } = await runAgent(
      {
        from: From ?? null,
        body: Body,
        messageSid: MessageSid,
        receivedAt: new Date().toISOString(),
      },
      {
        traceStore,
        weatherProvider: provider,
        includeRefId: config.FEATURE_INCLUDE_REF_ID,
        defaultLocation: config.DEFAULT_LOCATION,
        maxInputChars: config.MAX_INPUT_CHARS,
      },
    );

    await traceStore.saveIdempotency({
      messageSid: MessageSid,
      responseText: output.responseText,
      traceId: trace.trace_id,
      senderHash: hashPhone(From),
    });

    logger.info({ trace_id: trace.trace_id }, 'sms_processed');

    reply.type('text/xml').send(buildTwiML(output.responseText));
  });
}
