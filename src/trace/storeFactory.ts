import type { AppConfig } from '../utils/config.js';
import type { TraceStore } from './store.js';
import { FileTraceStore } from './fileStore.js';
import { MemoryTraceStore } from './memoryStore.js';
import { PostgresTraceStore } from './postgresStore.js';

export async function createTraceStore(config: AppConfig): Promise<TraceStore> {
  switch (config.TRACE_STORE_MODE) {
    case 'memory':
      return new MemoryTraceStore();
    case 'postgres':
      if (!config.DATABASE_URL) {
        throw new Error('DATABASE_URL is required when TRACE_STORE_MODE=postgres');
      }
      return PostgresTraceStore.create(config.DATABASE_URL);
    case 'file':
    default:
      return FileTraceStore.create(config.TRACE_STORE_PATH);
  }
}
