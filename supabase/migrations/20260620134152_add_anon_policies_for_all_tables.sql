-- ============================================================
-- CONTEXT: This project uses custom bcrypt auth with the anon key.
-- Supabase JWT is never issued, so auth.uid() is always NULL and
-- the 'authenticated' role is never active.
-- All existing policies target 'authenticated' → effectively blocking
-- every frontend query.
--
-- Fix: add permissive anon policies for every table the frontend
-- accesses. Application-layer auth (admin session token validation in
-- Edge Functions, client-side route guards) enforces who may do what.
-- admin_sessions is intentionally excluded (service-role only).
-- ============================================================

-- ── lesson_applications ────────────────────────────────────────────
DROP POLICY IF EXISTS "lesson_applications_anon_select" ON lesson_applications;
DROP POLICY IF EXISTS "lesson_applications_anon_insert" ON lesson_applications;
DROP POLICY IF EXISTS "lesson_applications_anon_update" ON lesson_applications;
DROP POLICY IF EXISTS "lesson_applications_anon_delete" ON lesson_applications;

CREATE POLICY "lesson_applications_anon_select" ON lesson_applications FOR SELECT TO anon USING (true);
CREATE POLICY "lesson_applications_anon_insert" ON lesson_applications FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "lesson_applications_anon_update" ON lesson_applications FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "lesson_applications_anon_delete" ON lesson_applications FOR DELETE TO anon USING (true);

-- ── time_slots ─────────────────────────────────────────────────────
DROP POLICY IF EXISTS "time_slots_anon_select" ON time_slots;
DROP POLICY IF EXISTS "time_slots_anon_insert" ON time_slots;
DROP POLICY IF EXISTS "time_slots_anon_update" ON time_slots;
DROP POLICY IF EXISTS "time_slots_anon_delete" ON time_slots;

CREATE POLICY "time_slots_anon_select" ON time_slots FOR SELECT TO anon USING (true);
CREATE POLICY "time_slots_anon_insert" ON time_slots FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "time_slots_anon_update" ON time_slots FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "time_slots_anon_delete" ON time_slots FOR DELETE TO anon USING (true);

-- ── reservations ───────────────────────────────────────────────────
DROP POLICY IF EXISTS "reservations_anon_select" ON reservations;
DROP POLICY IF EXISTS "reservations_anon_insert" ON reservations;
DROP POLICY IF EXISTS "reservations_anon_update" ON reservations;
DROP POLICY IF EXISTS "reservations_anon_delete" ON reservations;

CREATE POLICY "reservations_anon_select" ON reservations FOR SELECT TO anon USING (true);
CREATE POLICY "reservations_anon_insert" ON reservations FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "reservations_anon_update" ON reservations FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "reservations_anon_delete" ON reservations FOR DELETE TO anon USING (true);

-- ── extensions ─────────────────────────────────────────────────────
DROP POLICY IF EXISTS "extensions_anon_select" ON extensions;
DROP POLICY IF EXISTS "extensions_anon_insert" ON extensions;
DROP POLICY IF EXISTS "extensions_anon_update" ON extensions;
DROP POLICY IF EXISTS "extensions_anon_delete" ON extensions;

CREATE POLICY "extensions_anon_select" ON extensions FOR SELECT TO anon USING (true);
CREATE POLICY "extensions_anon_insert" ON extensions FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "extensions_anon_update" ON extensions FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "extensions_anon_delete" ON extensions FOR DELETE TO anon USING (true);

-- ── points_history ─────────────────────────────────────────────────
DROP POLICY IF EXISTS "points_history_anon_select" ON points_history;
DROP POLICY IF EXISTS "points_history_anon_insert" ON points_history;
DROP POLICY IF EXISTS "points_history_anon_update" ON points_history;
DROP POLICY IF EXISTS "points_history_anon_delete" ON points_history;

CREATE POLICY "points_history_anon_select" ON points_history FOR SELECT TO anon USING (true);
CREATE POLICY "points_history_anon_insert" ON points_history FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "points_history_anon_update" ON points_history FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "points_history_anon_delete" ON points_history FOR DELETE TO anon USING (true);

-- ── ranking_backup ─────────────────────────────────────────────────
DROP POLICY IF EXISTS "ranking_backup_anon_select" ON ranking_backup;
DROP POLICY IF EXISTS "ranking_backup_anon_insert" ON ranking_backup;
DROP POLICY IF EXISTS "ranking_backup_anon_update" ON ranking_backup;
DROP POLICY IF EXISTS "ranking_backup_anon_delete" ON ranking_backup;

CREATE POLICY "ranking_backup_anon_select" ON ranking_backup FOR SELECT TO anon USING (true);
CREATE POLICY "ranking_backup_anon_insert" ON ranking_backup FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "ranking_backup_anon_update" ON ranking_backup FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "ranking_backup_anon_delete" ON ranking_backup FOR DELETE TO anon USING (true);

-- ── notifications ──────────────────────────────────────────────────
DROP POLICY IF EXISTS "notifications_anon_select" ON notifications;
DROP POLICY IF EXISTS "notifications_anon_insert" ON notifications;
DROP POLICY IF EXISTS "notifications_anon_update" ON notifications;
DROP POLICY IF EXISTS "notifications_anon_delete" ON notifications;

CREATE POLICY "notifications_anon_select" ON notifications FOR SELECT TO anon USING (true);
CREATE POLICY "notifications_anon_insert" ON notifications FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "notifications_anon_update" ON notifications FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "notifications_anon_delete" ON notifications FOR DELETE TO anon USING (true);

-- ── platform_config ────────────────────────────────────────────────
DROP POLICY IF EXISTS "platform_config_anon_select" ON platform_config;
DROP POLICY IF EXISTS "platform_config_anon_insert" ON platform_config;
DROP POLICY IF EXISTS "platform_config_anon_update" ON platform_config;
DROP POLICY IF EXISTS "platform_config_anon_delete" ON platform_config;

CREATE POLICY "platform_config_anon_select" ON platform_config FOR SELECT TO anon USING (true);
CREATE POLICY "platform_config_anon_insert" ON platform_config FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "platform_config_anon_update" ON platform_config FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "platform_config_anon_delete" ON platform_config FOR DELETE TO anon USING (true);

-- ── products ───────────────────────────────────────────────────────
DROP POLICY IF EXISTS "products_anon_select" ON products;
DROP POLICY IF EXISTS "products_anon_insert" ON products;
DROP POLICY IF EXISTS "products_anon_update" ON products;
DROP POLICY IF EXISTS "products_anon_delete" ON products;

CREATE POLICY "products_anon_select" ON products FOR SELECT TO anon USING (true);
CREATE POLICY "products_anon_insert" ON products FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "products_anon_update" ON products FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "products_anon_delete" ON products FOR DELETE TO anon USING (true);

-- ── registrations ──────────────────────────────────────────────────
DROP POLICY IF EXISTS "registrations_anon_select" ON registrations;
DROP POLICY IF EXISTS "registrations_anon_insert" ON registrations;
DROP POLICY IF EXISTS "registrations_anon_update" ON registrations;
DROP POLICY IF EXISTS "registrations_anon_delete" ON registrations;

CREATE POLICY "registrations_anon_select" ON registrations FOR SELECT TO anon USING (true);
CREATE POLICY "registrations_anon_insert" ON registrations FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "registrations_anon_update" ON registrations FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "registrations_anon_delete" ON registrations FOR DELETE TO anon USING (true);

-- ── project_works ──────────────────────────────────────────────────
DROP POLICY IF EXISTS "project_works_anon_select" ON project_works;
DROP POLICY IF EXISTS "project_works_anon_insert" ON project_works;
DROP POLICY IF EXISTS "project_works_anon_update" ON project_works;
DROP POLICY IF EXISTS "project_works_anon_delete" ON project_works;

CREATE POLICY "project_works_anon_select" ON project_works FOR SELECT TO anon USING (true);
CREATE POLICY "project_works_anon_insert" ON project_works FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "project_works_anon_update" ON project_works FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "project_works_anon_delete" ON project_works FOR DELETE TO anon USING (true);

-- ── weekly_templates ───────────────────────────────────────────────
DROP POLICY IF EXISTS "weekly_templates_anon_select" ON weekly_templates;
DROP POLICY IF EXISTS "weekly_templates_anon_insert" ON weekly_templates;
DROP POLICY IF EXISTS "weekly_templates_anon_update" ON weekly_templates;
DROP POLICY IF EXISTS "weekly_templates_anon_delete" ON weekly_templates;

CREATE POLICY "weekly_templates_anon_select" ON weekly_templates FOR SELECT TO anon USING (true);
CREATE POLICY "weekly_templates_anon_insert" ON weekly_templates FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "weekly_templates_anon_update" ON weekly_templates FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "weekly_templates_anon_delete" ON weekly_templates FOR DELETE TO anon USING (true);

-- ── reward_transactions ────────────────────────────────────────────
DROP POLICY IF EXISTS "reward_transactions_anon_select" ON reward_transactions;
DROP POLICY IF EXISTS "reward_transactions_anon_insert" ON reward_transactions;
DROP POLICY IF EXISTS "reward_transactions_anon_update" ON reward_transactions;
DROP POLICY IF EXISTS "reward_transactions_anon_delete" ON reward_transactions;

CREATE POLICY "reward_transactions_anon_select" ON reward_transactions FOR SELECT TO anon USING (true);
CREATE POLICY "reward_transactions_anon_insert" ON reward_transactions FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "reward_transactions_anon_update" ON reward_transactions FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "reward_transactions_anon_delete" ON reward_transactions FOR DELETE TO anon USING (true);

-- ── financial_events ───────────────────────────────────────────────
DROP POLICY IF EXISTS "financial_events_anon_select" ON financial_events;
DROP POLICY IF EXISTS "financial_events_anon_insert" ON financial_events;
DROP POLICY IF EXISTS "financial_events_anon_update" ON financial_events;
DROP POLICY IF EXISTS "financial_events_anon_delete" ON financial_events;

CREATE POLICY "financial_events_anon_select" ON financial_events FOR SELECT TO anon USING (true);
CREATE POLICY "financial_events_anon_insert" ON financial_events FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "financial_events_anon_update" ON financial_events FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "financial_events_anon_delete" ON financial_events FOR DELETE TO anon USING (true);

-- ── studio_env ─────────────────────────────────────────────────────
DROP POLICY IF EXISTS "studio_env_anon_select" ON studio_env;
DROP POLICY IF EXISTS "studio_env_anon_insert" ON studio_env;
DROP POLICY IF EXISTS "studio_env_anon_update" ON studio_env;
DROP POLICY IF EXISTS "studio_env_anon_delete" ON studio_env;

CREATE POLICY "studio_env_anon_select" ON studio_env FOR SELECT TO anon USING (true);
CREATE POLICY "studio_env_anon_insert" ON studio_env FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "studio_env_anon_update" ON studio_env FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "studio_env_anon_delete" ON studio_env FOR DELETE TO anon USING (true);

-- ── studio_playlists ───────────────────────────────────────────────
DROP POLICY IF EXISTS "studio_playlists_anon_select" ON studio_playlists;
DROP POLICY IF EXISTS "studio_playlists_anon_insert" ON studio_playlists;
DROP POLICY IF EXISTS "studio_playlists_anon_update" ON studio_playlists;
DROP POLICY IF EXISTS "studio_playlists_anon_delete" ON studio_playlists;

CREATE POLICY "studio_playlists_anon_select" ON studio_playlists FOR SELECT TO anon USING (true);
CREATE POLICY "studio_playlists_anon_insert" ON studio_playlists FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "studio_playlists_anon_update" ON studio_playlists FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "studio_playlists_anon_delete" ON studio_playlists FOR DELETE TO anon USING (true);

-- ── task_assignments ───────────────────────────────────────────────
DROP POLICY IF EXISTS "task_assignments_anon_select" ON task_assignments;
DROP POLICY IF EXISTS "task_assignments_anon_insert" ON task_assignments;
DROP POLICY IF EXISTS "task_assignments_anon_update" ON task_assignments;
DROP POLICY IF EXISTS "task_assignments_anon_delete" ON task_assignments;

CREATE POLICY "task_assignments_anon_select" ON task_assignments FOR SELECT TO anon USING (true);
CREATE POLICY "task_assignments_anon_insert" ON task_assignments FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "task_assignments_anon_update" ON task_assignments FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "task_assignments_anon_delete" ON task_assignments FOR DELETE TO anon USING (true);

-- ── game_point_logs ────────────────────────────────────────────────
-- Already has anon SELECT; add the remaining operations for completeness.
DROP POLICY IF EXISTS "game_point_logs_anon_select" ON game_point_logs;
DROP POLICY IF EXISTS "game_point_logs_anon_insert" ON game_point_logs;
DROP POLICY IF EXISTS "game_point_logs_anon_update" ON game_point_logs;
DROP POLICY IF EXISTS "game_point_logs_anon_delete" ON game_point_logs;

CREATE POLICY "game_point_logs_anon_select" ON game_point_logs FOR SELECT TO anon USING (true);
CREATE POLICY "game_point_logs_anon_insert" ON game_point_logs FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "game_point_logs_anon_update" ON game_point_logs FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "game_point_logs_anon_delete" ON game_point_logs FOR DELETE TO anon USING (true);

-- ── admin_settings ─────────────────────────────────────────────────
DROP POLICY IF EXISTS "admin_settings_anon_select" ON admin_settings;
DROP POLICY IF EXISTS "admin_settings_anon_insert" ON admin_settings;
DROP POLICY IF EXISTS "admin_settings_anon_update" ON admin_settings;
DROP POLICY IF EXISTS "admin_settings_anon_delete" ON admin_settings;

CREATE POLICY "admin_settings_anon_select" ON admin_settings FOR SELECT TO anon USING (true);
CREATE POLICY "admin_settings_anon_insert" ON admin_settings FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "admin_settings_anon_update" ON admin_settings FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "admin_settings_anon_delete" ON admin_settings FOR DELETE TO anon USING (true);

-- ── admin_sessions ─────────────────────────────────────────────────
-- Intentionally no anon policies. Only service-role (Edge Functions) may
-- read or write session tokens. Zero policies = zero anon access.
