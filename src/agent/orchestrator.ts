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
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      trace.events.push({
        type: 'step_failed',
        step: name,
        timestamp: nowIso(),
        duration_ms: Date.now() - startedAt,
        error: message,
      });
      logger.error({ step: name, error: message }, 'step_failed');
      throw error;
    }
  };

  try {
    intent = await step('parseIntent', async () => parseIntent(body), { body });
    const locationQuery = intent.locationText ?? options.defaultLocation;
    location = await step('resolveLocation', async () => resolveLocation(locationQuery), {
      query: locationQuery,
    });
    weather = await step(
      'fetchWeather',
      async () =>
        fetchWeather({
          provider: options.weatherProvider,
          location,
          date: intent.date,
          recordedWeather: options.replay?.recordedWeather,
          useRecorded: options.replay?.useRecordedWeather,
        }),
      { location: location.name, date: intent.date, provider: options.weatherProvider.name },
    );

    const responseText = await step('generateRecommendation', async () =>
      generateRecommendation({
        intent,
        weather,
        includeRefId: options.includeRefId,
        traceId,
      }),
    );

    trace.output = {
      response_text: responseText,
      weather_snapshot: weather,
    };

    await options.traceStore.saveTrace(trace);

    return {
      output: { responseText, weather },
      trace,
    };
  } catch (error) {
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
