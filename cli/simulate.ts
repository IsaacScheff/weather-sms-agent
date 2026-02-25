import { loadConfig } from '../src/utils/config.js';
import { FileTraceStore } from '../src/trace/fileStore.js';
import { runAgent } from '../src/agent/orchestrator.js';
import { OpenMeteoProvider } from '../src/weather/openMeteoProvider.js';

const args = process.argv.slice(2);
const jsonFlagIndex = args.indexOf('--json');
const jsonOutput = jsonFlagIndex !== -1;
if (jsonOutput) args.splice(jsonFlagIndex, 1);

const input = args.join(' ').trim();
if (!input) {
  console.error('Usage: pnpm sim "weather in Brooklyn tomorrow" [--json]');
  process.exit(1);
}

const config = loadConfig();
const traceStore = await FileTraceStore.create(config.TRACE_STORE_PATH);

const { output, trace } = await runAgent(
  {
    from: '+15555550123',
    body: input,
    messageSid: `SIM_${Date.now()}`,
    receivedAt: new Date().toISOString(),
  },
  {
    traceStore,
    weatherProvider: new OpenMeteoProvider(),
    includeRefId: config.FEATURE_INCLUDE_REF_ID,
    defaultLocation: config.DEFAULT_LOCATION,
    maxInputChars: config.MAX_INPUT_CHARS,
  },
);

if (jsonOutput) {
  console.log(
    JSON.stringify({ response: output.responseText, trace_id: trace.trace_id, events: trace.events }, null, 2),
  );
} else {
  console.log('Response:');
  console.log(output.responseText);
  console.log('\nTrace Events:');
  for (const event of trace.events) {
    console.log(`- ${event.type} ${event.step} (${event.duration_ms ?? 0}ms)`);
  }
}
