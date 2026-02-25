import Fastify from 'fastify';
import formbody from '@fastify/formbody';
import { registerRoutes } from './routes.js';
import { loadConfig } from '../utils/config.js';
import { createTraceStore } from '../trace/storeFactory.js';

const config = loadConfig();

const app = Fastify({
  logger: true,
});

await app.register(formbody);

const traceStore = await createTraceStore(config);
await registerRoutes(app, traceStore);

const port = Number.parseInt(config.PORT, 10);
await app.listen({ port, host: '0.0.0.0' });
