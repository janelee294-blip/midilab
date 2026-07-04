-- Restrict password verification to the authenticated caller's own profile.
CREATE OR REPLACE FUNCTION public.verify_current_password(
  p_user_id uuid,
  p_password text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $function$
DECLARE
  v_hash text;
BEGIN
  IF p_user_id IS DISTINCT FROM auth.uid() THEN
    RETURN false;
  END IF;

  SELECT p.password
  INTO v_hash
  FROM public.profiles AS p
  WHERE p.id = p_user_id;

  IF v_hash IS NULL OR v_hash = '' THEN
    RETURN false;
  END IF;

  RETURN COALESCE(
    extensions.crypt(p_password, v_hash) = v_hash,
    false
  );
END;
$function$;

REVOKE EXECUTE
ON FUNCTION public.verify_current_password(uuid, text)
FROM PUBLIC, anon;

GRANT EXECUTE
ON FUNCTION public.verify_current_password(uuid, text)
TO authenticated;

-- Rollback SQL (manual use only; restores the previous, less restrictive behavior):
--
-- CREATE OR REPLACE FUNCTION public.verify_current_password(
--   p_user_id uuid,
--   p_password text
-- )
-- RETURNS boolean
-- LANGUAGE plpgsql
-- SECURITY DEFINER
-- AS $function$
-- DECLARE
--   v_hash text;
-- BEGIN
--   SELECT password
--   INTO v_hash
--   FROM profiles
--   WHERE id = p_user_id;
--
--   IF v_hash IS NULL OR v_hash = '' THEN
--     RETURN false;
--   END IF;
--
--   RETURN crypt(p_password, v_hash) = v_hash;
-- END;
-- $function$;
--
-- ALTER FUNCTION public.verify_current_password(uuid, text) RESET ALL;
--
-- GRANT EXECUTE
-- ON FUNCTION public.verify_current_password(uuid, text)
-- TO PUBLIC, anon, authenticated;
