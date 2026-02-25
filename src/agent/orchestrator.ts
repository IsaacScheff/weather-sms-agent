import { parseIntent } from './steps/parseIntent.js';
import { resolveLocation } from './steps/resolveLocation.js';
import { fetchWeather } from './steps/fetchWeather.js';
import { generateRecommendation } from './steps/generateRecommendation.js';
import type { AgentInput, AgentOutput, Intent, Location, Trace, TraceEvent, WeatherSnapshot } from './types.js';
import { createLogger, hashPhone, redactPhone } from '../utils/logger.js';
import { nowIso } from '../utils/time.js';
import { makeId } from '../utils/ids.js';
import type { TraceStore } from '../trace/store.js';
import type { WeatherProvider } from '../weather/provider.js';

export type OrchestratorOptions = {
  traceStore: TraceStore;
  weatherProvider: WeatherProvider;
  includeRefId: boolean;
  defaultLocation: string;
  maxInputChars: number;
  replay?: {
    useRecordedWeather?: boolean;
    recordedWeather?: WeatherSnapshot;
  };
};

export async function runAgent(
  input: AgentInput,
  options: OrchestratorOptions,
): Promise<{ output: AgentOutput; trace: Trace }>
{
  const traceId = makeId('trace');
  const logger = createLogger({ trace_id: traceId });
  const body = input.body.slice(0, options.maxInputChars);

  const trace: Trace = {
    trace_id: traceId,
    created_at: nowIso(),
    input: {
      from_hash: hashPhone(input.from),
      from_redacted: redactPhone(input.from),
      body,
      message_sid: input.messageSid,
      received_at: input.receivedAt,
    },
    events: [],
    idempotency_key: input.messageSid,
  };

  let intent: Intent | undefined;
  let location: Location | undefined;
  let weather: WeatherSnapshot | undefined;

  const step = async <T>(name: TraceEvent['step'], fn: () => Promise<T>, inputData?: Record<string, unknown>) => {
    const startedAt = Date.now();
    const eventStart: TraceEvent = {
      type: 'step_started',
      step: name,
      timestamp: nowIso(),
      input: inputData,
    };
    trace.events.push(eventStart);
    try {
      const result = await fn();
      trace.events.push({
        type: 'step_succeeded',
        step: name,
        timestamp: nowIso(),
        duration_ms: Date.now() - startedAt,
        output: sanitizeOutput(result),
      });
      return result;
    } catch (_error) {
      const message = _error instanceof Error ? _error.message : 'Unknown error';
      trace.events.push({
        type: 'step_failed',
        step: name,
        timestamp: nowIso(),
        duration_ms: Date.now() - startedAt,
        error: message,
      });
      logger.error({ step: name, error: message }, 'step_failed');
      throw _error;
    }
  };

  try {
    intent = await step('parseIntent', async () => parseIntent(body), { body });
    if (!intent) {
      throw new Error('Missing intent');
    }
    const resolvedIntent = intent;
    const senderId = input.from?.trim() ?? null;
    const storedState = resolvedIntent.locationText
      ? undefined
      : senderId
        ? await options.traceStore.getConversationState(senderId)
        : undefined;
    const storedLocation = storedState?.last_location;
    const locationQuery = resolvedIntent.locationText ?? options.defaultLocation;
    location = await step(
      'resolveLocation',
      async () => {
        if (resolvedIntent.locationText) {
          return resolveLocation(locationQuery);
        }
        if (storedLocation) {
          return storedLocation;
        }
        return resolveLocation(locationQuery);
      },
      {
      query: resolvedIntent.locationText ?? storedLocation?.name ?? options.defaultLocation,
      source: resolvedIntent.locationText ? 'message' : storedLocation ? 'memory' : 'default',
      },
    );
    if (!location) {
      throw new Error('Missing location');
    }
    const resolvedLocation = location;
    if (senderId && resolvedIntent.locationText) {
      await options.traceStore.saveConversationState(senderId, {
        last_location: resolvedLocation,
        updated_at: nowIso(),
      });
    }
    weather = await step(
      'fetchWeather',
      async () =>
        fetchWeather({
          provider: options.weatherProvider,
          location: resolvedLocation,
          date: resolvedIntent.date,
          recordedWeather: options.replay?.recordedWeather,
          useRecorded: options.replay?.useRecordedWeather,
        }),
      { location: resolvedLocation.name, date: resolvedIntent.date, provider: options.weatherProvider.name },
    );
    if (!weather) {
      throw new Error('Missing weather');
    }
    const resolvedWeather = weather;

    const responseText = await step('generateRecommendation', async () =>
      generateRecommendation({
        intent: resolvedIntent,
        weather: resolvedWeather,
        includeRefId: options.includeRefId,
        traceId,
      }),
    );

    trace.output = {
      response_text: responseText,
      weather_snapshot: resolvedWeather,
    };

    await options.traceStore.saveTrace(trace);

    return {
      output: { responseText, weather: resolvedWeather },
      trace,
    };
  } catch {
    const responseText =
      'Sorry, I could not retrieve the forecast right now. Please try again soon.';
    trace.output = { response_text: responseText };
    await options.traceStore.saveTrace(trace);
    return {
      output: { responseText },
      trace,
    };
  }
}

function sanitizeOutput(value: unknown): Record<string, unknown> | undefined {
  if (!value) return undefined;
  if (typeof value === 'string') return { value };
  if (typeof value === 'object') {
    const raw = value as Record<string, unknown>;
    if ('responseText' in raw) {
      return { responseText: raw.responseText };
    }
    return raw;
  }
  return { value };
}
