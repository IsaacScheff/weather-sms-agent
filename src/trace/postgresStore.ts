import { Pool } from 'pg';
import type { Trace, WeatherSnapshot } from '../agent/types.js';
import type { ConversationState, IdempotencyRecord, TraceStore } from './store.js';

type StoredTracePayload = {
  input?: Trace['input'];
  output?: Trace['output'];
  events?: Trace['events'];
};

export class PostgresTraceStore implements TraceStore {
  constructor(private readonly pool: Pool) {}

  static create(databaseUrl: string): PostgresTraceStore {
    const pool = new Pool({ connectionString: databaseUrl });
    return new PostgresTraceStore(pool);
  }

  async close(): Promise<void> {
    await this.pool.end();
  }

  async saveTrace(trace: Trace): Promise<void> {
    const payload: StoredTracePayload = {
      input: trace.input,
      output: trace.output,
      events: trace.events,
    };
    const recordedWeather = trace.output?.weather_snapshot ?? null;

    await this.pool.query(
      `INSERT INTO traces (trace_id, sender_hash, events_json, recorded_weather_json)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (trace_id)
       DO UPDATE SET sender_hash = EXCLUDED.sender_hash,
         events_json = EXCLUDED.events_json,
         recorded_weather_json = EXCLUDED.recorded_weather_json`,
      [
        trace.trace_id,
        trace.input.from_hash ?? null,
        payload,
        recordedWeather,
      ],
    );
  }

  async getTrace(traceId: string): Promise<Trace | undefined> {
    const result = await this.pool.query(
      'SELECT trace_id, sender_hash, events_json, recorded_weather_json, created_at FROM traces WHERE trace_id = $1',
      [traceId],
    );
    if (result.rowCount === 0) {
      return undefined;
    }
    const row = result.rows[0] as {
      trace_id: string;
      sender_hash: string | null;
      events_json: StoredTracePayload | Trace['events'];
      recorded_weather_json: WeatherSnapshot | null;
      created_at: Date;
    };

    const payload = Array.isArray(row.events_json)
      ? { events: row.events_json }
      : row.events_json;
    const input = payload.input ?? {
      body: '',
      message_sid: row.trace_id,
      received_at: row.created_at.toISOString(),
    };
    const output = payload.output ?? (row.recorded_weather_json
      ? { response_text: '', weather_snapshot: row.recorded_weather_json }
      : undefined);

    return {
      trace_id: row.trace_id,
      created_at: row.created_at.toISOString(),
      input,
      events: payload.events ?? [],
      output,
      idempotency_key: input.message_sid ?? row.trace_id,
    };
  }

  async getIdempotency(messageSid: string): Promise<IdempotencyRecord | undefined> {
    const result = await this.pool.query(
      'SELECT message_sid, trace_id, response_text, sender_hash FROM messages WHERE message_sid = $1',
      [messageSid],
    );
    if (result.rowCount === 0) {
      return undefined;
    }
    const row = result.rows[0] as {
      message_sid: string;
      trace_id: string;
      response_text: string;
      sender_hash: string;
    };
    return {
      messageSid: row.message_sid,
      traceId: row.trace_id,
      responseText: row.response_text,
      senderHash: row.sender_hash,
    };
  }

  async saveIdempotency(record: IdempotencyRecord): Promise<void> {
    if (!record.senderHash) {
      throw new Error('senderHash is required to save idempotency in Postgres.');
    }
    await this.pool.query(
      `INSERT INTO messages (message_sid, sender_hash, trace_id, response_text)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (message_sid)
       DO UPDATE SET sender_hash = EXCLUDED.sender_hash,
         trace_id = EXCLUDED.trace_id,
         response_text = EXCLUDED.response_text`,
      [record.messageSid, record.senderHash, record.traceId, record.responseText],
    );
  }

  async getConversationState(senderId: string): Promise<ConversationState | undefined> {
    const result = await this.pool.query(
      'SELECT last_location_name, last_lat, last_lon, updated_at FROM conversations WHERE sender_hash = $1',
      [senderId],
    );
    if (result.rowCount === 0) {
      return undefined;
    }
    const row = result.rows[0] as {
      last_location_name: string | null;
      last_lat: number | null;
      last_lon: number | null;
      updated_at: Date;
    };
    const hasLocation = row.last_location_name && row.last_lat !== null && row.last_lon !== null;
    return {
      last_location: hasLocation
        ? {
            name: row.last_location_name!,
            latitude: row.last_lat!,
            longitude: row.last_lon!,
          }
        : undefined,
      updated_at: row.updated_at.toISOString(),
    };
  }

  async saveConversationState(senderId: string, state: ConversationState): Promise<void> {
    const location = state.last_location;
    await this.pool.query(
      `INSERT INTO conversations (sender_hash, last_location_name, last_lat, last_lon, updated_at)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (sender_hash)
       DO UPDATE SET last_location_name = EXCLUDED.last_location_name,
         last_lat = EXCLUDED.last_lat,
         last_lon = EXCLUDED.last_lon,
         updated_at = EXCLUDED.updated_at`,
      [
        senderId,
        location?.name ?? null,
        location?.latitude ?? null,
        location?.longitude ?? null,
        state.updated_at,
      ],
    );
  }
}
