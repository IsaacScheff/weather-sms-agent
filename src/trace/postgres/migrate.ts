import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Pool } from 'pg';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function migrationsDir(): string {
  return path.resolve(__dirname, '../../../../migrations');
}

export async function applyMigrations(databaseUrl: string): Promise<void> {
  const pool = new Pool({ connectionString: databaseUrl });
  try {
    await pool.query(
      'CREATE TABLE IF NOT EXISTS schema_migrations (filename TEXT PRIMARY KEY, applied_at TIMESTAMPTZ NOT NULL DEFAULT now())',
    );

    const dir = migrationsDir();
    const entries = await fs.readdir(dir);
    const migrations = entries.filter((name) => name.endsWith('.sql')).sort();

    for (const filename of migrations) {
      const applied = await pool.query(
        'SELECT 1 FROM schema_migrations WHERE filename = $1',
        [filename],
      );
      if (applied.rowCount && applied.rowCount > 0) {
        continue;
      }
      const filePath = path.join(dir, filename);
      const sql = await fs.readFile(filePath, 'utf8');
      await pool.query('BEGIN');
      try {
        await pool.query(sql);
        await pool.query(
          'INSERT INTO schema_migrations (filename) VALUES ($1)',
          [filename],
        );
        await pool.query('COMMIT');
      } catch (error) {
        await pool.query('ROLLBACK');
        throw error;
      }
    }
  } finally {
    await pool.end();
  }
}
