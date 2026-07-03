-- Restrict the unused privileged student-approval RPC to server-side callers.
GRANT EXECUTE
ON FUNCTION public.approve_student(uuid, integer, integer, integer)
TO service_role;

REVOKE EXECUTE
ON FUNCTION public.approve_student(uuid, integer, integer, integer)
FROM PUBLIC, anon, authenticated;

-- Rollback SQL (run manually only if this migration must be reverted):
--
-- GRANT EXECUTE
-- ON FUNCTION public.approve_student(uuid, integer, integer, integer)
-- TO PUBLIC, anon, authenticated, service_role;
