import type { Location, Trace } from '../agent/types.js';

export type IdempotencyRecord = {
  messageSid: string;
  responseText: string;
  traceId: string;
  senderHash?: string;
};

export type ConversationState = {
  last_location?: Location;
  updated_at: string;
};

export interface TraceStore {
  saveTrace(_trace: Trace): Promise<void>;
  getTrace(_traceId: string): Promise<Trace | undefined>;
  getIdempotency(_messageSid: string): Promise<IdempotencyRecord | undefined>;
  saveIdempotency(_record: IdempotencyRecord): Promise<void>;
  getConversationState(_senderId: string): Promise<ConversationState | undefined>;
  saveConversationState(_senderId: string, _state: ConversationState): Promise<void>;
}
