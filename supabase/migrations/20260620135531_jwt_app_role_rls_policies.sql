-- ============================================================
-- JWT app_role-based RLS policies
--
-- Every authenticated request now carries a custom JWT issued by
-- the admin-login Edge Function.  The JWT payload includes:
--   role      : "authenticated"  (activates the authenticated PG role)
--   sub       : profile uuid     (auth.uid() returns this)
--   app_role  : "admin"|"student"
--
-- RLS policies check app_role via current_setting('request.jwt.claims').
-- This is self-contained in the JWT — no sub-query on profiles is needed,
-- so there is zero risk of infinite recursion.
-- ============================================================

-- ── Helper macro (used inline in every policy) ───────────────────────────────
-- (COALESCE(current_setting('request.jwt.claims', true), '{}')::jsonb ->> 'app_role') = 'admin'
-- (COALESCE(current_setting('request.jwt.claims', true), '{}')::jsonb ->> 'app_role') = 'student'

-- ── Drop all legacy authenticated policies (used broken recursive checks) ───

DROP POLICY IF EXISTS "extensions_delete_admin"         ON extensions;
DROP POLICY IF EXISTS "extensions_insert"               ON extensions;
DROP POLICY IF EXISTS "extensions_select"               ON extensions;
DROP POLICY IF EXISTS "extensions_update_admin"         ON extensions;

DROP POLICY IF EXISTS "applications_delete_admin"       ON lesson_applications;
DROP POLICY IF EXISTS "applications_select_admin"       ON lesson_applications;
DROP POLICY IF EXISTS "applications_update_admin"       ON lesson_applications;
-- applications_anon_insert (anon INSERT for public signup form) is intentionally kept.

DROP POLICY IF EXISTS "notifications_delete_admin"      ON notifications;
DROP POLICY IF EXISTS "notifications_insert"            ON notifications;
DROP POLICY IF EXISTS "notifications_select"            ON notifications;
DROP POLICY IF EXISTS "notifications_update"            ON notifications;

DROP POLICY IF EXISTS "config_delete_admin"             ON platform_config;
DROP POLICY IF EXISTS "config_insert_admin"             ON platform_config;
DROP POLICY IF EXISTS "config_select_admin"             ON platform_config;
DROP POLICY IF EXISTS "config_update_admin"             ON platform_config;

DROP POLICY IF EXISTS "points_history_delete_admin"     ON points_history;
DROP POLICY IF EXISTS "points_history_insert_admin"     ON points_history;
DROP POLICY IF EXISTS "points_history_select"           ON points_history;
DROP POLICY IF EXISTS "points_history_update_admin"     ON points_history;

DROP POLICY IF EXISTS "delete_products"                 ON products;
DROP POLICY IF EXISTS "insert_products"                 ON products;
DROP POLICY IF EXISTS "update_products"                 ON products;
-- select_products is TO public — works for unauthenticated signup page, kept.

DROP POLICY IF EXISTS "ranking_backup_delete_admin"     ON ranking_backup;
DROP POLICY IF EXISTS "ranking_backup_insert_admin"     ON ranking_backup;
DROP POLICY IF EXISTS "ranking_backup_select"           ON ranking_backup;
DROP POLICY IF EXISTS "ranking_backup_update_admin"     ON ranking_backup;

DROP POLICY IF EXISTS "registrations_delete"            ON registrations;
DROP POLICY IF EXISTS "registrations_insert"            ON registrations;
DROP POLICY IF EXISTS "registrations_select"            ON registrations;
DROP POLICY IF EXISTS "registrations_update"            ON registrations;

DROP POLICY IF EXISTS "reservations_delete_admin"       ON reservations;
DROP POLICY IF EXISTS "reservations_insert"             ON reservations;
DROP POLICY IF EXISTS "reservations_select"             ON reservations;
DROP POLICY IF EXISTS "reservations_update"             ON reservations;

DROP POLICY IF EXISTS "delete_reward_transactions"      ON reward_transactions;
DROP POLICY IF EXISTS "insert_reward_transactions"      ON reward_transactions;
DROP POLICY IF EXISTS "select_own_reward_transactions"  ON reward_transactions;
DROP POLICY IF EXISTS "update_reward_transactions"      ON reward_transactions;

DROP POLICY IF EXISTS "admin_all_studio_env"            ON studio_env;

DROP POLICY IF EXISTS "admin_all_playlists"             ON studio_playlists;
DROP POLICY IF EXISTS "read_active_playlists"           ON studio_playlists;

DROP POLICY IF EXISTS "slots_delete_admin"              ON time_slots;
DROP POLICY IF EXISTS "slots_insert_admin"              ON time_slots;
DROP POLICY IF EXISTS "slots_select_auth"               ON time_slots;
DROP POLICY IF EXISTS "slots_update_auth"               ON time_slots;

DROP POLICY IF EXISTS "select_own_game_point_logs"      ON game_point_logs;

-- ── ADMIN: full access to all tables ─────────────────────────────────────────

CREATE POLICY "admin_all" ON profiles FOR ALL TO authenticated
  USING  ((COALESCE(current_setting('request.jwt.claims', true), '{}')::jsonb ->> 'app_role') = 'admin')
  WITH CHECK ((COALESCE(current_setting('request.jwt.claims', true), '{}')::jsonb ->> 'app_role') = 'admin');

CREATE POLICY "admin_all" ON lesson_applications FOR ALL TO authenticated
  USING  ((COALESCE(current_setting('request.jwt.claims', true), '{}')::jsonb ->> 'app_role') = 'admin')
  WITH CHECK ((COALESCE(current_setting('request.jwt.claims', true), '{}')::jsonb ->> 'app_role') = 'admin');

CREATE POLICY "admin_all" ON time_slots FOR ALL TO authenticated
  USING  ((COALESCE(current_setting('request.jwt.claims', true), '{}')::jsonb ->> 'app_role') = 'admin')
  WITH CHECK ((COALESCE(current_setting('request.jwt.claims', true), '{}')::jsonb ->> 'app_role') = 'admin');

CREATE POLICY "admin_all" ON reservations FOR ALL TO authenticated
  USING  ((COALESCE(current_setting('request.jwt.claims', true), '{}')::jsonb ->> 'app_role') = 'admin')
  WITH CHECK ((COALESCE(current_setting('request.jwt.claims', true), '{}')::jsonb ->> 'app_role') = 'admin');

CREATE POLICY "admin_all" ON extensions FOR ALL TO authenticated
  USING  ((COALESCE(current_setting('request.jwt.claims', true), '{}')::jsonb ->> 'app_role') = 'admin')
  WITH CHECK ((COALESCE(current_setting('request.jwt.claims', true), '{}')::jsonb ->> 'app_role') = 'admin');

CREATE POLICY "admin_all" ON points_history FOR ALL TO authenticated
  USING  ((COALESCE(current_setting('request.jwt.claims', true), '{}')::jsonb ->> 'app_role') = 'admin')
  WITH CHECK ((COALESCE(current_setting('request.jwt.claims', true), '{}')::jsonb ->> 'app_role') = 'admin');

CREATE POLICY "admin_all" ON ranking_backup FOR ALL TO authenticated
  USING  ((COALESCE(current_setting('request.jwt.claims', true), '{}')::jsonb ->> 'app_role') = 'admin')
  WITH CHECK ((COALESCE(current_setting('request.jwt.claims', true), '{}')::jsonb ->> 'app_role') = 'admin');

CREATE POLICY "admin_all" ON notifications FOR ALL TO authenticated
  USING  ((COALESCE(current_setting('request.jwt.claims', true), '{}')::jsonb ->> 'app_role') = 'admin')
  WITH CHECK ((COALESCE(current_setting('request.jwt.claims', true), '{}')::jsonb ->> 'app_role') = 'admin');

CREATE POLICY "admin_all" ON platform_config FOR ALL TO authenticated
  USING  ((COALESCE(current_setting('request.jwt.claims', true), '{}')::jsonb ->> 'app_role') = 'admin')
  WITH CHECK ((COALESCE(current_setting('request.jwt.claims', true), '{}')::jsonb ->> 'app_role') = 'admin');

CREATE POLICY "admin_all" ON products FOR ALL TO authenticated
  USING  ((COALESCE(current_setting('request.jwt.claims', true), '{}')::jsonb ->> 'app_role') = 'admin')
  WITH CHECK ((COALESCE(current_setting('request.jwt.claims', true), '{}')::jsonb ->> 'app_role') = 'admin');

CREATE POLICY "admin_all" ON registrations FOR ALL TO authenticated
  USING  ((COALESCE(current_setting('request.jwt.claims', true), '{}')::jsonb ->> 'app_role') = 'admin')
  WITH CHECK ((COALESCE(current_setting('request.jwt.claims', true), '{}')::jsonb ->> 'app_role') = 'admin');

CREATE POLICY "admin_all" ON project_works FOR ALL TO authenticated
  USING  ((COALESCE(current_setting('request.jwt.claims', true), '{}')::jsonb ->> 'app_role') = 'admin')
  WITH CHECK ((COALESCE(current_setting('request.jwt.claims', true), '{}')::jsonb ->> 'app_role') = 'admin');

CREATE POLICY "admin_all" ON weekly_templates FOR ALL TO authenticated
  USING  ((COALESCE(current_setting('request.jwt.claims', true), '{}')::jsonb ->> 'app_role') = 'admin')
  WITH CHECK ((COALESCE(current_setting('request.jwt.claims', true), '{}')::jsonb ->> 'app_role') = 'admin');

CREATE POLICY "admin_all" ON reward_transactions FOR ALL TO authenticated
  USING  ((COALESCE(current_setting('request.jwt.claims', true), '{}')::jsonb ->> 'app_role') = 'admin')
  WITH CHECK ((COALESCE(current_setting('request.jwt.claims', true), '{}')::jsonb ->> 'app_role') = 'admin');

CREATE POLICY "admin_all" ON financial_events FOR ALL TO authenticated
  USING  ((COALESCE(current_setting('request.jwt.claims', true), '{}')::jsonb ->> 'app_role') = 'admin')
  WITH CHECK ((COALESCE(current_setting('request.jwt.claims', true), '{}')::jsonb ->> 'app_role') = 'admin');

CREATE POLICY "admin_all" ON studio_env FOR ALL TO authenticated
  USING  ((COALESCE(current_setting('request.jwt.claims', true), '{}')::jsonb ->> 'app_role') = 'admin')
  WITH CHECK ((COALESCE(current_setting('request.jwt.claims', true), '{}')::jsonb ->> 'app_role') = 'admin');

CREATE POLICY "admin_all" ON studio_playlists FOR ALL TO authenticated
  USING  ((COALESCE(current_setting('request.jwt.claims', true), '{}')::jsonb ->> 'app_role') = 'admin')
  WITH CHECK ((COALESCE(current_setting('request.jwt.claims', true), '{}')::jsonb ->> 'app_role') = 'admin');

CREATE POLICY "admin_all" ON task_assignments FOR ALL TO authenticated
  USING  ((COALESCE(current_setting('request.jwt.claims', true), '{}')::jsonb ->> 'app_role') = 'admin')
  WITH CHECK ((COALESCE(current_setting('request.jwt.claims', true), '{}')::jsonb ->> 'app_role') = 'admin');

CREATE POLICY "admin_all" ON game_point_logs FOR ALL TO authenticated
  USING  ((COALESCE(current_setting('request.jwt.claims', true), '{}')::jsonb ->> 'app_role') = 'admin')
  WITH CHECK ((COALESCE(current_setting('request.jwt.claims', true), '{}')::jsonb ->> 'app_role') = 'admin');

CREATE POLICY "admin_all" ON admin_settings FOR ALL TO authenticated
  USING  ((COALESCE(current_setting('request.jwt.claims', true), '{}')::jsonb ->> 'app_role') = 'admin')
  WITH CHECK ((COALESCE(current_setting('request.jwt.claims', true), '{}')::jsonb ->> 'app_role') = 'admin');

-- ── STUDENT: read/write own data only ────────────────────────────────────────

-- profiles: read own, update own (password change, etc.)
CREATE POLICY "student_select_own" ON profiles FOR SELECT TO authenticated
  USING (auth.uid() = id
    AND (COALESCE(current_setting('request.jwt.claims', true), '{}')::jsonb ->> 'app_role') = 'student');

CREATE POLICY "student_update_own" ON profiles FOR UPDATE TO authenticated
  USING (auth.uid() = id
    AND (COALESCE(current_setting('request.jwt.claims', true), '{}')::jsonb ->> 'app_role') = 'student')
  WITH CHECK (auth.uid() = id);

-- time_slots: students read all slots (calendar view) and update booked_by
CREATE POLICY "student_select_slots" ON time_slots FOR SELECT TO authenticated
  USING ((COALESCE(current_setting('request.jwt.claims', true), '{}')::jsonb ->> 'app_role') = 'student');

CREATE POLICY "student_update_slots" ON time_slots FOR UPDATE TO authenticated
  USING ((COALESCE(current_setting('request.jwt.claims', true), '{}')::jsonb ->> 'app_role') = 'student')
  WITH CHECK (true);

-- reservations: students create and view their own
CREATE POLICY "student_select_own" ON reservations FOR SELECT TO authenticated
  USING (auth.uid() = user_id
    AND (COALESCE(current_setting('request.jwt.claims', true), '{}')::jsonb ->> 'app_role') = 'student');

CREATE POLICY "student_insert_own" ON reservations FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id
    AND (COALESCE(current_setting('request.jwt.claims', true), '{}')::jsonb ->> 'app_role') = 'student');

CREATE POLICY "student_update_own" ON reservations FOR UPDATE TO authenticated
  USING (auth.uid() = user_id
    AND (COALESCE(current_setting('request.jwt.claims', true), '{}')::jsonb ->> 'app_role') = 'student')
  WITH CHECK (auth.uid() = user_id);

-- extensions: students submit and view own requests
CREATE POLICY "student_select_own" ON extensions FOR SELECT TO authenticated
  USING (auth.uid() = user_id
    AND (COALESCE(current_setting('request.jwt.claims', true), '{}')::jsonb ->> 'app_role') = 'student');

CREATE POLICY "student_insert_own" ON extensions FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id
    AND (COALESCE(current_setting('request.jwt.claims', true), '{}')::jsonb ->> 'app_role') = 'student');

-- registrations: students submit and view own
CREATE POLICY "student_select_own" ON registrations FOR SELECT TO authenticated
  USING (auth.uid() = student_id
    AND (COALESCE(current_setting('request.jwt.claims', true), '{}')::jsonb ->> 'app_role') = 'student');

CREATE POLICY "student_insert_own" ON registrations FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = student_id
    AND (COALESCE(current_setting('request.jwt.claims', true), '{}')::jsonb ->> 'app_role') = 'student');

-- points_history: students view own
CREATE POLICY "student_select_own" ON points_history FOR SELECT TO authenticated
  USING (auth.uid() = user_id
    AND (COALESCE(current_setting('request.jwt.claims', true), '{}')::jsonb ->> 'app_role') = 'student');

-- game_point_logs: students view own
CREATE POLICY "student_select_own" ON game_point_logs FOR SELECT TO authenticated
  USING (auth.uid() = user_id
    AND (COALESCE(current_setting('request.jwt.claims', true), '{}')::jsonb ->> 'app_role') = 'student');

-- ranking_backup: students view all (leaderboard)
CREATE POLICY "student_select_all" ON ranking_backup FOR SELECT TO authenticated
  USING ((COALESCE(current_setting('request.jwt.claims', true), '{}')::jsonb ->> 'app_role') = 'student');

-- notifications: students view their own + broadcast (user_id IS NULL)
CREATE POLICY "student_select_own" ON notifications FOR SELECT TO authenticated
  USING ((auth.uid() = user_id OR user_id IS NULL)
    AND (COALESCE(current_setting('request.jwt.claims', true), '{}')::jsonb ->> 'app_role') = 'student');

-- studio_env / studio_playlists: students read for MyStudio
CREATE POLICY "student_select" ON studio_env FOR SELECT TO authenticated
  USING ((COALESCE(current_setting('request.jwt.claims', true), '{}')::jsonb ->> 'app_role') = 'student');

CREATE POLICY "student_select" ON studio_playlists FOR SELECT TO authenticated
  USING ((COALESCE(current_setting('request.jwt.claims', true), '{}')::jsonb ->> 'app_role') = 'student');

-- task_assignments: students view own
CREATE POLICY "student_select_own" ON task_assignments FOR SELECT TO authenticated
  USING (auth.uid() = student_id
    AND (COALESCE(current_setting('request.jwt.claims', true), '{}')::jsonb ->> 'app_role') = 'student');

-- reward_transactions: students view own
CREATE POLICY "student_select_own" ON reward_transactions FOR SELECT TO authenticated
  USING (auth.uid() = student_id
    AND (COALESCE(current_setting('request.jwt.claims', true), '{}')::jsonb ->> 'app_role') = 'student');

-- project_works: students view own
CREATE POLICY "student_select_own" ON project_works FOR SELECT TO authenticated
  USING (auth.uid() = student_id
    AND (COALESCE(current_setting('request.jwt.claims', true), '{}')::jsonb ->> 'app_role') = 'student');

-- products: students need to read for registration/re-registration forms.
-- select_products (TO public) already covers anon; add authenticated read too.
CREATE POLICY "student_select" ON products FOR SELECT TO authenticated
  USING ((COALESCE(current_setting('request.jwt.claims', true), '{}')::jsonb ->> 'app_role') = 'student');
