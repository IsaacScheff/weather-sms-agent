export type StepName =
  | 'parseIntent'
  | 'resolveLocation'
  | 'fetchWeather'
  | 'generateRecommendation';

export type TraceEventType = 'step_started' | 'step_succeeded' | 'step_failed';

export type TraceEvent = {
  type: TraceEventType;
  step: StepName;
  timestamp: string;
  duration_ms?: number;
  input?: Record<string, unknown>;
  output?: Record<string, unknown>;
  error?: string;
};

export type Intent = {
  question: string;
  date: string; // YYYY-MM-DD
  activity?: string;
  locationText?: string;
};

export type Location = {
  name: string;
  latitude: number;
  longitude: number;
};

export type WeatherSnapshot = {
  location_name: string;
  date: string;
  temp_high_c: number;
  temp_low_c: number;
  precip_prob: number;
  wind_kph?: number;
  condition_summary: string;
  alerts?: string[];
};

export type AgentInput = {
  from: string | null;
  body: string;
  messageSid: string;
  receivedAt: string;
};

export type AgentOutput = {
  responseText: string;
  weather?: WeatherSnapshot;
};

export type Trace = {
  trace_id: string;
  created_at: string;
  input: {
    from_hash?: string;
    from_redacted?: string;
    body: string;
    message_sid: string;
    received_at: string;
  };
  events: TraceEvent[];
  output?: {
    response_text: string;
    weather_snapshot?: WeatherSnapshot;
  };
  idempotency_key: string;
};

export type StepContext = {
  traceId: string;
};
