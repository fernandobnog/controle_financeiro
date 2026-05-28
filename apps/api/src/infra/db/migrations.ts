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

      CREATE TABLE IF NOT EXISTS accounts (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
        email TEXT NOT NULL UNIQUE,
        full_name TEXT NOT NULL,
        role TEXT NOT NULL,
        password_hash TEXT NOT NULL,
        password_salt TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS households (
        id TEXT PRIMARY KEY,
        account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
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
        account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
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

      CREATE INDEX IF NOT EXISTS idx_users_account_id ON users (account_id);
      CREATE INDEX IF NOT EXISTS idx_households_account_id ON households (account_id);
      CREATE INDEX IF NOT EXISTS idx_incomes_household_id ON incomes (household_id);
      CREATE INDEX IF NOT EXISTS idx_debts_household_id ON debts (household_id);
      CREATE INDEX IF NOT EXISTS idx_budget_envelopes_household_id ON budget_envelopes (household_id);
      CREATE INDEX IF NOT EXISTS idx_documents_account_id ON documents (account_id);
      CREATE INDEX IF NOT EXISTS idx_documents_household_id ON documents (household_id);
      CREATE INDEX IF NOT EXISTS idx_documents_status ON documents (status);
      CREATE INDEX IF NOT EXISTS idx_ocr_entries_document_id ON ocr_entries (document_id);
    `
  },
  {
    name: '002-account-scope-auth',
    sql: `
      CREATE TABLE IF NOT EXISTS accounts (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        account_id TEXT NOT NULL,
        email TEXT NOT NULL UNIQUE,
        full_name TEXT NOT NULL,
        role TEXT NOT NULL,
        password_hash TEXT NOT NULL,
        password_salt TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      ALTER TABLE households ADD COLUMN IF NOT EXISTS account_id TEXT;
      UPDATE households SET account_id = 'account-1' WHERE account_id IS NULL;
      ALTER TABLE households ALTER COLUMN account_id SET NOT NULL;

      ALTER TABLE documents ADD COLUMN IF NOT EXISTS account_id TEXT;
      UPDATE documents SET account_id = 'account-1' WHERE account_id IS NULL;
      ALTER TABLE documents ALTER COLUMN account_id SET NOT NULL;

      CREATE INDEX IF NOT EXISTS idx_users_account_id ON users (account_id);
      CREATE INDEX IF NOT EXISTS idx_households_account_id ON households (account_id);
      CREATE INDEX IF NOT EXISTS idx_documents_account_id ON documents (account_id);
    `
  },
  {
    name: '003-onboarding-password-recovery',
    sql: `
      ALTER TABLE accounts ADD COLUMN IF NOT EXISTS onboarding_completed_at TIMESTAMPTZ;

      CREATE TABLE IF NOT EXISTS password_reset_tokens (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        token_hash TEXT NOT NULL UNIQUE,
        expires_at TIMESTAMPTZ NOT NULL,
        used_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_user_id ON password_reset_tokens (user_id);
      CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_expires_at ON password_reset_tokens (expires_at);
    `
  },
  {
    name: '004-domain-expansion',
    sql: `
      -- Tipo do documento e metadados de processamento na tabela documents
      ALTER TABLE documents ADD COLUMN IF NOT EXISTS document_type TEXT NOT NULL DEFAULT 'unknown';
      ALTER TABLE documents ADD COLUMN IF NOT EXISTS page_count INTEGER;
      ALTER TABLE documents ADD COLUMN IF NOT EXISTS file_hash TEXT;
      ALTER TABLE documents ADD COLUMN IF NOT EXISTS pipeline_status TEXT NOT NULL DEFAULT 'received';
      ALTER TABLE documents ADD COLUMN IF NOT EXISTS pipeline_error TEXT;

      -- Itens extraídos pelo pipeline de IA (separados das entidades consolidadas)
      CREATE TABLE IF NOT EXISTS extracted_items (
        id TEXT PRIMARY KEY,
        document_id TEXT NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
        household_id TEXT NOT NULL REFERENCES households(id) ON DELETE CASCADE,
        item_type TEXT NOT NULL,
        description TEXT NOT NULL,
        amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
        occurred_at DATE,
        recurrence TEXT,
        creditor TEXT,
        ai_confidence NUMERIC(4, 3) NOT NULL DEFAULT 0,
        ai_category TEXT,
        review_status TEXT NOT NULL DEFAULT 'pending',
        review_decision TEXT,
        reviewed_by TEXT REFERENCES users(id),
        reviewed_at TIMESTAMPTZ,
        consolidated_entity_type TEXT,
        consolidated_entity_id TEXT,
        source_page INTEGER,
        raw_text TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      -- Eventos do pipeline de processamento por documento
      CREATE TABLE IF NOT EXISTS document_pipeline_events (
        id TEXT PRIMARY KEY,
        document_id TEXT NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
        event_type TEXT NOT NULL,
        status TEXT NOT NULL,
        detail TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      -- Versões de plano financeiro (histórico)
      CREATE TABLE IF NOT EXISTS plan_versions (
        id TEXT PRIMARY KEY,
        household_id TEXT NOT NULL REFERENCES households(id) ON DELETE CASCADE,
        strategy TEXT NOT NULL,
        extra_payment NUMERIC(12, 2) NOT NULL DEFAULT 0,
        monthly_income NUMERIC(12, 2) NOT NULL DEFAULT 0,
        monthly_debt_payments NUMERIC(12, 2) NOT NULL DEFAULT 0,
        dti_percent NUMERIC(8, 4) NOT NULL DEFAULT 0,
        classification TEXT NOT NULL,
        active BOOLEAN NOT NULL DEFAULT FALSE,
        payload JSONB NOT NULL DEFAULT '{}',
        created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      -- Eventos de auditoria para revisões sensíveis
      CREATE TABLE IF NOT EXISTS audit_events (
        id TEXT PRIMARY KEY,
        account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
        household_id TEXT REFERENCES households(id) ON DELETE SET NULL,
        user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
        event_type TEXT NOT NULL,
        entity_type TEXT NOT NULL,
        entity_id TEXT NOT NULL,
        before_state JSONB,
        after_state JSONB,
        ip_address TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_extracted_items_document_id ON extracted_items (document_id);
      CREATE INDEX IF NOT EXISTS idx_extracted_items_household_id ON extracted_items (household_id);
      CREATE INDEX IF NOT EXISTS idx_extracted_items_review_status ON extracted_items (review_status);
      CREATE INDEX IF NOT EXISTS idx_document_pipeline_events_document_id ON document_pipeline_events (document_id);
      CREATE INDEX IF NOT EXISTS idx_plan_versions_household_id ON plan_versions (household_id);
      CREATE INDEX IF NOT EXISTS idx_plan_versions_active ON plan_versions (active);
      CREATE INDEX IF NOT EXISTS idx_audit_events_account_id ON audit_events (account_id);
      CREATE INDEX IF NOT EXISTS idx_audit_events_entity ON audit_events (entity_type, entity_id);
    `
  }
];