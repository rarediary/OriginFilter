-- OriginFilter origin classification database (PostgreSQL)
CREATE TABLE IF NOT EXISTS accounts (
  platform TEXT NOT NULL CHECK(platform IN ('instagram','facebook','x')),
  account_id TEXT NOT NULL,
  handle TEXT,
  country_code CHAR(2),
  status TEXT NOT NULL DEFAULT 'unknown' CHECK(status IN ('verified','reported','probable','unknown','disputed')),
  confidence NUMERIC(4,3) CHECK(confidence BETWEEN 0 AND 1),
  evidence_source TEXT,
  evidence_reference TEXT,
  observed_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY(platform,account_id),
  CHECK(country_code IS NULL OR country_code ~ '^[A-Z]{2}$')
);
CREATE INDEX IF NOT EXISTS accounts_handle_idx ON accounts(platform,lower(handle));
CREATE INDEX IF NOT EXISTS accounts_expiry_idx ON accounts(expires_at);
CREATE TABLE IF NOT EXISTS evidence (
  id BIGSERIAL PRIMARY KEY,
  platform TEXT NOT NULL,
  account_id TEXT NOT NULL,
  source TEXT NOT NULL,
  country_code CHAR(2),
  source_reference TEXT,
  observed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  FOREIGN KEY(platform,account_id) REFERENCES accounts(platform,account_id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS evidence_account_idx ON evidence(platform,account_id);
