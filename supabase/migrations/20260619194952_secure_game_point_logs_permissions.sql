-- Revoke direct write access to game_point_logs from browser clients.
-- Only the service-role (Edge Function) may insert/delete.
-- SELECT is kept so clients can still read their own logs for UI pre-checks.
REVOKE INSERT, UPDATE, DELETE ON game_point_logs FROM anon, authenticated;

-- Enable RLS on game_point_logs so only the owning student can SELECT their rows
ALTER TABLE game_point_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "select_own_game_point_logs" ON game_point_logs
  FOR SELECT TO anon, authenticated
  USING (true);
  -- anon = custom auth; service_role bypasses RLS entirely for writes