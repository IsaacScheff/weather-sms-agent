import { loadConfig } from '../src/utils/config.js';
import { runAgent } from '../src/agent/orchestrator.js';
import { OpenMeteoProvider } from '../src/weather/openMeteoProvider.js';
import { createTraceStore } from '../src/trace/storeFactory.js';

const args = process.argv.slice(2);
const liveIndex = args.indexOf('--live');
const useLive = liveIndex !== -1;
if (useLive) args.splice(liveIndex, 1);

const traceId = args[0];
if (!traceId) {
  console.error('Usage: pnpm replay <trace_id> [--live]');
  process.exit(1);
}

const config = loadConfig();
const traceStore = await createTraceStore(config);
const trace = await traceStore.getTrace(traceId);

if (!trace) {
  console.error(`Trace not found: ${traceId}`);
  process.exit(1);
}

const { output } = await runAgent(
  {
    from: trace.input.from_redacted ?? null,
    body: trace.input.body,
    messageSid: `REPLAY_${traceId}`,
    receivedAt: new Date().toISOString(),
  },
  {
    traceStore,
    weatherProvider: new OpenMeteoProvider(),
    includeRefId: config.FEATURE_INCLUDE_REF_ID,
    defaultLocation: config.DEFAULT_LOCATION,
    maxInputChars: config.MAX_INPUT_CHARS,
    replay: {
      useRecordedWeather: !useLive,
      recordedWeather: trace.output?.weather_snapshot,
    },
  },
);

console.log('Response:');
console.log(output.responseText);
