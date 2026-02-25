import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { Pool } from 'pg';
import { applyMigrations } from '../src/trace/postgres/migrate.js';
import { PostgresTraceStore } from '../src/trace/postgresStore.js';

const databaseUrl = process.env.DATABASE_URL;
const shouldRun = process.env.POSTGRES_TESTS === '1' && Boolean(databaseUrl);
const suite = shouldRun ? describe : describe.skip;

suite('PostgresTraceStore', () => {
  let pool: Pool;

  beforeAll(async () => {
    pool = new Pool({ connectionString: databaseUrl });
    await applyMigrations(databaseUrl!);
  });

  beforeEach(async () => {
    await pool.query('DELETE FROM messages');
    await pool.query('DELETE FROM traces');
    await pool.query('DELETE FROM conversations');
  });

  afterAll(async () => {
    await pool.end();
  });

  it('persists idempotency and conversation state', async () => {
    const store = PostgresTraceStore.create(databaseUrl!);
    const senderHash = 'sender_hash_test';

    await store.saveConversationState(senderHash, {
      last_location: {
        name: 'Seattle, WA',
        latitude: 47.61,
        longitude: -122.33,
      },
      updated_at: new Date('2026-02-25T10:00:00Z').toISOString(),
    });

    await store.saveIdempotency({
      messageSid: 'SM123',
      responseText: 'OK',
      traceId: 'trace_123',
      senderHash,
    });

    const storedConversation = await store.getConversationState(senderHash);
    expect(storedConversation?.last_location?.name).toBe('Seattle, WA');

    const storedIdempotency = await store.getIdempotency('SM123');
    expect(storedIdempotency?.responseText).toBe('OK');

    await store.close();
  });
});
