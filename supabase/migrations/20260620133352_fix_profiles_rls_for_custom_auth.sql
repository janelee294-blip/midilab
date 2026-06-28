-- Drop all existing broken policies on profiles.
-- They use auth.uid() which is always NULL in this project (custom anon-key auth),
-- and the admin-check sub-selects cause infinite recursion.
DROP POLICY IF EXISTS "profiles_select_own"    ON profiles;
DROP POLICY IF EXISTS "profiles_update_own"    ON profiles;
DROP POLICY IF EXISTS "profiles_insert_own"    ON profiles;
DROP POLICY IF EXISTS "profiles_delete_admin"  ON profiles;

-- SELECT: all frontend reads use the anon key (no Supabase JWT is issued).
-- Allowing anon SELECT mirrors the pattern used for financial_events and admin_settings.
-- Password is excluded at the query layer (select list), not here.
CREATE POLICY "profiles_select" ON profiles
  FOR SELECT TO anon
  USING (true);

-- UPDATE: admin operations (student edits, status changes, expiry updates) and
-- student self-updates (ticket deduction, password change) all use the anon key.
-- Application-layer auth enforces who may call what; no recursion risk here.
CREATE POLICY "profiles_update" ON profiles
  FOR UPDATE TO anon
  USING (true)
  WITH CHECK (true);

-- INSERT and DELETE are intentionally left without anon policies.
-- Profile creation and deletion are performed exclusively via Edge Functions
-- running under the service role, which bypasses RLS entirely.
