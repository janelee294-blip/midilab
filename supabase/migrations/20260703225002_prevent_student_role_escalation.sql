-- Emergency hardening: prevent a student JWT from changing its own
-- profiles.role to admin while preserving all other existing profile updates.
ALTER POLICY "student_update_own"
ON public.profiles
USING (
  auth.uid() = id
  AND (
    COALESCE(current_setting('request.jwt.claims', true), '{}')::jsonb ->> 'app_role'
  ) = 'student'
)
WITH CHECK (
  auth.uid() = id
  AND role = 'student'
  AND (
    COALESCE(current_setting('request.jwt.claims', true), '{}')::jsonb ->> 'app_role'
  ) = 'student'
);

-- Rollback SQL (run manually only if this migration must be reverted):
--
-- ALTER POLICY "student_update_own"
-- ON public.profiles
-- USING (
--   auth.uid() = id
--   AND (
--     COALESCE(current_setting('request.jwt.claims', true), '{}')::jsonb ->> 'app_role'
--   ) = 'student'
-- )
-- WITH CHECK (
--   auth.uid() = id
-- );
