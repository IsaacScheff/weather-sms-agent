import Fastify from 'fastify';
import formbody from '@fastify/formbody';
import { registerRoutes } from './routes.js';
import { loadConfig } from '../utils/config.js';
import { FileTraceStore } from '../trace/fileStore.js';
import { MemoryTraceStore } from '../trace/memoryStore.js';

const config = loadConfig();

const app = Fastify({
  logger: true,
});

await app.register(formbody);

const traceStore = config.TRACE_STORE_MODE === 'memory'
  ? new MemoryTraceStore()
  : await FileTraceStore.create(config.TRACE_STORE_PATH);
await registerRoutes(app, traceStore);

const port = Number.parseInt(config.PORT, 10);
await app.listen({ port, host: '0.0.0.0' });
