import type { Trace } from '../agent/types.js';
import type { IdempotencyRecord, TraceStore } from './store.js';

export class MemoryTraceStore implements TraceStore {
  private traces = new Map<string, Trace>();
  private idempotency = new Map<string, IdempotencyRecord>();

  async saveTrace(trace: Trace): Promise<void> {
    this.traces.set(trace.trace_id, trace);
  }

  async getTrace(traceId: string): Promise<Trace | undefined> {
    return this.traces.get(traceId);
  }

  async getIdempotency(messageSid: string): Promise<IdempotencyRecord | undefined> {
    return this.idempotency.get(messageSid);
  }

  async saveIdempotency(record: IdempotencyRecord): Promise<void> {
    this.idempotency.set(record.messageSid, record);
  }
}
