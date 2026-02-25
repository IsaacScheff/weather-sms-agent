import type { Trace } from '../agent/types.js';

export type IdempotencyRecord = {
  messageSid: string;
  responseText: string;
  traceId: string;
};

export interface TraceStore {
  saveTrace(trace: Trace): Promise<void>;
  getTrace(traceId: string): Promise<Trace | undefined>;
  getIdempotency(messageSid: string): Promise<IdempotencyRecord | undefined>;
  saveIdempotency(record: IdempotencyRecord): Promise<void>;
}
