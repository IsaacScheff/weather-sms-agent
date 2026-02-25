CREATE TABLE IF NOT EXISTS schema_migrations (
  filename TEXT PRIMARY KEY,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS conversations (
  sender_hash TEXT PRIMARY KEY,
  last_location_name TEXT NULL,
  last_lat DOUBLE PRECISION NULL,
  last_lon DOUBLE PRECISION NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS messages (
  message_sid TEXT PRIMARY KEY,
  sender_hash TEXT NOT NULL,
  trace_id TEXT NOT NULL,
  response_text TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS messages_sender_hash_idx ON messages(sender_hash);

CREATE TABLE IF NOT EXISTS traces (
  trace_id TEXT PRIMARY KEY,
  sender_hash TEXT NULL,
  events_json JSONB NOT NULL,
  recorded_weather_json JSONB NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS traces_sender_hash_idx ON traces(sender_hash);
