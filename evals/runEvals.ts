import fs from 'node:fs/promises';
import { runAgent } from '../src/agent/orchestrator.js';
import { MemoryTraceStore } from '../src/trace/memoryStore.js';
import type { WeatherProvider } from '../src/weather/provider.js';
import type { WeatherSnapshot } from '../src/agent/types.js';
import { loadConfig } from '../src/utils/config.js';

type EvalCase = {
  id: string;
  input: string;
  expected_contains: string[];
  expected_style: { max_chars: number };
  severity: 'low' | 'medium' | 'high';
  mock_weather?: WeatherSnapshot;
};

class MockWeatherProvider implements WeatherProvider {
  name = 'mock';
  constructor(private readonly _snapshot: WeatherSnapshot) {}
  async getForecast(): Promise<WeatherSnapshot> {
    return this._snapshot;
  }
}

function loadDataset(raw: string): EvalCase[] {
  return raw
    .split('\n')
    .filter((line) => line.trim().length > 0)
    .map((line) => JSON.parse(line) as EvalCase);
}

function scoreCase(output: string, evalCase: EvalCase): string[] {
  const failures: string[] = [];
  const lower = output.toLowerCase();

  for (const token of evalCase.expected_contains) {
    if (!lower.includes(token.toLowerCase())) {
      failures.push(`missing_expected:${token}`);
    }
  }

  if (output.length > evalCase.expected_style.max_chars) {
    failures.push('exceeds_max_chars');
  }

  if (!lower.includes('high') || !lower.includes('low')) {
    failures.push('missing_temps');
  }

  if (!output.includes('·')) {
    failures.push('missing_two_recommendations');
  }

  return failures;
}

const datasetPath = new URL('./dataset.jsonl', import.meta.url);
const raw = await fs.readFile(datasetPath, 'utf8');
const cases = loadDataset(raw);
const config = loadConfig();

let failedHigh = false;
const results: Array<{ id: string; failures: string[] }> = [];

for (const evalCase of cases) {
  const traceStore = new MemoryTraceStore();
  const provider = evalCase.mock_weather
    ? new MockWeatherProvider(evalCase.mock_weather)
    : null;

  const { output } = await runAgent(
    {
      from: null,
      body: evalCase.input,
      messageSid: `EVAL_${evalCase.id}`,
      receivedAt: new Date().toISOString(),
    },
    {
      traceStore,
      weatherProvider: provider ?? new MockWeatherProvider({
        location_name: 'Default',
        date: '2026-02-25',
        temp_high_c: 20,
        temp_low_c: 10,
        precip_prob: 0.1,
        wind_kph: 5,
        condition_summary: 'Clear sky',
      }),
      includeRefId: false,
      defaultLocation: config.DEFAULT_LOCATION,
      maxInputChars: config.MAX_INPUT_CHARS,
    },
  );

  const failures = scoreCase(output.responseText, evalCase);
  results.push({ id: evalCase.id, failures });
  if (failures.length > 0 && evalCase.severity === 'high') {
    failedHigh = true;
  }
}

for (const result of results) {
  if (result.failures.length > 0) {
    console.log(`${result.id}: FAIL -> ${result.failures.join(', ')}`);
  } else {
    console.log(`${result.id}: PASS`);
  }
}

if (failedHigh) {
  console.error('High severity evals failed');
  process.exit(1);
}
