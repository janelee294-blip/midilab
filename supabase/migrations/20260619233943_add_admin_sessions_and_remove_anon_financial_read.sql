-- ─── admin_sessions: server-issued session tokens for admin Edge-Function auth ──
CREATE TABLE IF NOT EXISTS admin_sessions (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  token      text        NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '24 hours')
);

CREATE INDEX IF NOT EXISTS idx_admin_sessions_token      ON admin_sessions(token);
CREATE INDEX IF NOT EXISTS idx_admin_sessions_expires_at ON admin_sessions(expires_at);

-- RLS on, zero policies → only service-role (Edge Functions) can touch this table
ALTER TABLE admin_sessions ENABLE ROW LEVEL SECURITY;

-- ─── Remove the anon SELECT policies that leaked financial data ────────────────
-- financial_events: no policy left → zero anon access (reads also go via Edge Function)
DROP POLICY IF EXISTS "financial_events_read" ON financial_events;

-- admin_settings: same
DROP POLICY IF EXISTS "admin_settings_read" ON admin_settings;
