import { loadConfig } from '../src/utils/config.js';
import { applyMigrations } from '../src/trace/postgres/migrate.js';

const config = loadConfig();

if (!config.DATABASE_URL) {
  console.error('DATABASE_URL is required to run migrations.');
  process.exit(1);
}

await applyMigrations(config.DATABASE_URL);
console.log('Migrations applied.');
