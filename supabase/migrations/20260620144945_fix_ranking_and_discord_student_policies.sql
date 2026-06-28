-- ── Fix 1: Ranking ────────────────────────────────────────────────────────────
-- Students need to read all active-student profiles for the leaderboard.
-- The existing student_select_own policy only allows auth.uid() = id.
-- Add a separate policy that opens active student rows to authenticated students.
CREATE POLICY "student_select_rankings" ON profiles FOR SELECT TO authenticated
  USING (
    role = 'student'
    AND status = 'active'
    AND (COALESCE(current_setting('request.jwt.claims', true), '{}')::jsonb ->> 'app_role') = 'student'
  );

-- ── Fix 2: Discord webhook ─────────────────────────────────────────────────────
-- sendDiscordNotification() reads platform_config to get the admin Discord
-- webhook URL. No student policy existed, so every fetch returned null and
-- notifications silently dropped. Allow authenticated students to SELECT it.
CREATE POLICY "student_select" ON platform_config FOR SELECT TO authenticated
  USING ((COALESCE(current_setting('request.jwt.claims', true), '{}')::jsonb ->> 'app_role') = 'student');
