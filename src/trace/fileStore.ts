import fs from 'node:fs/promises';
import path from 'node:path';
import type { Trace } from '../agent/types.js';
import type { ConversationState, IdempotencyRecord, TraceStore } from './store.js';

export class FileTraceStore implements TraceStore {
  private traces = new Map<string, Trace>();
  private idempotency = new Map<string, IdempotencyRecord>();
  private conversations = new Map<string, ConversationState>();

  private constructor(private readonly _filePath: string) {}

  static async create(filePath: string): Promise<FileTraceStore> {
    const store = new FileTraceStore(filePath);
    await store.init();
    return store;
  }

  private async init(): Promise<void> {
    const dir = path.dirname(this._filePath);
    await fs.mkdir(dir, { recursive: true });
    try {
      const data = await fs.readFile(this._filePath, 'utf8');
      const lines = data.split('\n').filter((line) => line.trim().length > 0);
      for (const line of lines) {
        const record = JSON.parse(line) as
          | Trace
          | { record_type: 'conversation_state'; sender_id: string; state: ConversationState };
        if ('record_type' in record && record.record_type === 'conversation_state') {
          this.conversations.set(record.sender_id, record.state);
          continue;
        }
        const trace = record as Trace;
        if (!trace.trace_id) {
          continue;
        }
        this.traces.set(trace.trace_id, trace);
        if (trace.idempotency_key && trace.output?.response_text) {
          this.idempotency.set(trace.idempotency_key, {
            messageSid: trace.idempotency_key,
            responseText: trace.output.response_text,
            traceId: trace.trace_id,
          });
        }
      }
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        throw error;
      }
    }
  }

  async saveTrace(trace: Trace): Promise<void> {
    this.traces.set(trace.trace_id, trace);
    if (trace.idempotency_key && trace.output?.response_text) {
      this.idempotency.set(trace.idempotency_key, {
        messageSid: trace.idempotency_key,
        responseText: trace.output.response_text,
        traceId: trace.trace_id,
      });
    }
    const line = `${JSON.stringify(trace)}\n`;
    await fs.appendFile(this._filePath, line, 'utf8');
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

  async getConversationState(senderId: string): Promise<ConversationState | undefined> {
    return this.conversations.get(senderId);
  }

  async saveConversationState(senderId: string, state: ConversationState): Promise<void> {
    this.conversations.set(senderId, state);
    const line = `${JSON.stringify({ record_type: 'conversation_state', sender_id: senderId, state })}\n`;
    await fs.appendFile(this._filePath, line, 'utf8');
  }
}
