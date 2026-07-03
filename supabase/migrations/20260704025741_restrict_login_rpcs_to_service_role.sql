-- Restrict credential-checking RPCs to the service-role client used by the
-- admin-login Edge Function. Browser roles must not call these RPCs directly.
GRANT EXECUTE
ON FUNCTION public.login_by_phone(text, text)
TO service_role;

GRANT EXECUTE
ON FUNCTION public.login_admin_bypass(text)
TO service_role;

REVOKE EXECUTE
ON FUNCTION public.login_by_phone(text, text)
FROM PUBLIC, anon, authenticated;

REVOKE EXECUTE
ON FUNCTION public.login_admin_bypass(text)
FROM PUBLIC, anon, authenticated;

-- Rollback SQL (run manually only if this migration must be reverted):
--
-- GRANT EXECUTE
-- ON FUNCTION public.login_by_phone(text, text)
-- TO PUBLIC, anon, authenticated, service_role;
--
-- GRANT EXECUTE
-- ON FUNCTION public.login_admin_bypass(text)
-- TO PUBLIC, anon, authenticated, service_role;
