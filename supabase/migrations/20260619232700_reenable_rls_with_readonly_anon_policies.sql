-- Rollback the insecure RLS-disable and re-establish proper policies.
-- Write operations are now exclusively handled by service-role Edge Functions.
-- Anon (frontend) may only SELECT; all INSERT/UPDATE/DELETE go through Edge Functions.

ALTER TABLE financial_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_settings   ENABLE ROW LEVEL SECURITY;

-- Clean slate: drop every policy that allowed anon/authenticated writes
DROP POLICY IF EXISTS "select_financial_events"  ON financial_events;
DROP POLICY IF EXISTS "insert_financial_events"  ON financial_events;
DROP POLICY IF EXISTS "update_financial_events"  ON financial_events;
DROP POLICY IF EXISTS "delete_financial_events"  ON financial_events;

DROP POLICY IF EXISTS "admin_settings_select" ON admin_settings;
DROP POLICY IF EXISTS "admin_settings_insert" ON admin_settings;
DROP POLICY IF EXISTS "admin_settings_update" ON admin_settings;

-- Read-only access for the frontend (anon key) — consistent with project's read pattern.
-- All writes are via service-role Edge Functions that bypass RLS entirely.
CREATE POLICY "financial_events_read" ON financial_events
  FOR SELECT USING (true);

CREATE POLICY "admin_settings_read" ON admin_settings
  FOR SELECT USING (true);
