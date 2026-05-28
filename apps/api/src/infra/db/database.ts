import type { Pool, QueryResult, QueryResultRow } from 'pg';

import { newDb } from 'pg-mem';
import { sqlMigrations } from './migrations.js';
import { seedDatabase } from './seed.js';

let poolPromise: Promise<Pool> | null = null;

const createMemoryPool = async (): Promise<Pool> => {
  const db = newDb({ autoCreateForeignKeyIndices: true, noAstCoverageCheck: true });
  const adapter = db.adapters.createPg();
  const pool = new adapter.Pool();

  await runMigrations(pool);
  await seedDatabase(pool);

  return pool;
};

const createPostgresPool = async (): Promise<Pool> => {
  const { Pool: PgPool } = await import('pg');
  const pool = new PgPool({
    connectionString:
      process.env.DATABASE_URL ??
      'postgresql://controle_financeiro:controle_financeiro_dev@localhost:5432/controle_financeiro_dev'
  });

  await runMigrations(pool);

  if (process.env.AUTO_SEED_DB === 'true') {
    await seedDatabase(pool);
  }

  return pool;
};

const runMigrations = async (pool: Pool): Promise<void> => {
  await pool.query(
    `
      CREATE TABLE IF NOT EXISTS api_schema_migrations (
        name TEXT PRIMARY KEY,
        executed_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `
  );

  const appliedMigrations = await pool.query<{ name: string }>('SELECT name FROM api_schema_migrations');
  const appliedNames = new Set(appliedMigrations.rows.map((row) => row.name));

  for (const migration of sqlMigrations) {
    if (appliedNames.has(migration.name)) {
      continue;
    }

    await pool.query('BEGIN');

    try {
      await pool.query(migration.sql);
      await pool.query('INSERT INTO api_schema_migrations (name) VALUES ($1)', [migration.name]);
      await pool.query('COMMIT');
    } catch (error) {
      await pool.query('ROLLBACK');
      throw error;
    }
  }
};

const createDatabase = async (): Promise<Pool> => {
  if (process.env.NODE_ENV === 'test' || !process.env.DATABASE_URL) {
    return createMemoryPool();
  }

  return createPostgresPool();
};

export const prepareDatabase = async (): Promise<Pool> => {
  if (!poolPromise) {
    poolPromise = createDatabase();
  }

  return poolPromise;
};

export const queryDatabase = async <TRow extends QueryResultRow>(
  text: string,
  values: unknown[] = []
): Promise<QueryResult<TRow>> => {
  const pool = await prepareDatabase();

  return pool.query<TRow>(text, values);
};

export const getDatabasePool = async (): Promise<Pool> => prepareDatabase();

export const closeDatabase = async (): Promise<void> => {
  if (!poolPromise) {
    return;
  }

  const pool = await poolPromise;
  await pool.end();
  poolPromise = null;
};

export const migrateDatabase = async (): Promise<void> => {
  const pool = await prepareDatabase();

  await runMigrations(pool);
};

export const seedAppDatabase = async (): Promise<void> => {
  const pool = await prepareDatabase();

  await seedDatabase(pool);
};