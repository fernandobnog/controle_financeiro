export interface SqlMigration {
  name: string;
  sql: string;
}

export const sqlMigrations: SqlMigration[] = [
  {
    name: '001-initial-schema',
    sql: `
      CREATE TABLE IF NOT EXISTS api_schema_migrations (
        name TEXT PRIMARY KEY,
        executed_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS households (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS incomes (
        id TEXT PRIMARY KEY,
        household_id TEXT NOT NULL REFERENCES households(id) ON DELETE CASCADE,
        label TEXT NOT NULL,
        amount NUMERIC(12, 2) NOT NULL,
        recurring BOOLEAN NOT NULL DEFAULT TRUE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS debts (
        id TEXT PRIMARY KEY,
        household_id TEXT NOT NULL REFERENCES households(id) ON DELETE CASCADE,
        creditor TEXT NOT NULL,
        balance NUMERIC(12, 2) NOT NULL,
        monthly_payment NUMERIC(12, 2) NOT NULL,
        interest_rate NUMERIC(8, 4) NOT NULL,
        overdue_months INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS budget_envelopes (
        id TEXT PRIMARY KEY,
        household_id TEXT NOT NULL REFERENCES households(id) ON DELETE CASCADE,
        category TEXT NOT NULL,
        planned_amount NUMERIC(12, 2) NOT NULL,
        actual_amount NUMERIC(12, 2),
        created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS documents (
        id TEXT PRIMARY KEY,
        household_id TEXT NOT NULL REFERENCES households(id) ON DELETE CASCADE,
        file_server_document_id TEXT NOT NULL UNIQUE,
        filename TEXT NOT NULL,
        mime_type TEXT NOT NULL,
        size_in_bytes INTEGER NOT NULL,
        status TEXT NOT NULL,
        signed_download_url TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS ocr_entries (
        id TEXT PRIMARY KEY,
        document_id TEXT NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
        description TEXT NOT NULL,
        amount NUMERIC(12, 2) NOT NULL,
        occurred_at DATE NOT NULL,
        category TEXT NOT NULL,
        reviewed BOOLEAN NOT NULL DEFAULT FALSE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_incomes_household_id ON incomes (household_id);
      CREATE INDEX IF NOT EXISTS idx_debts_household_id ON debts (household_id);
      CREATE INDEX IF NOT EXISTS idx_budget_envelopes_household_id ON budget_envelopes (household_id);
      CREATE INDEX IF NOT EXISTS idx_documents_household_id ON documents (household_id);
      CREATE INDEX IF NOT EXISTS idx_documents_status ON documents (status);
      CREATE INDEX IF NOT EXISTS idx_ocr_entries_document_id ON ocr_entries (document_id);
    `
  }
];