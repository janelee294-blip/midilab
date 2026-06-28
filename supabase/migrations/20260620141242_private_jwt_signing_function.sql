-- ============================================================
-- Private JWT signing function using pgcrypto (already installed)
-- and app.settings.jwt_secret (Supabase stores the project JWT
-- secret here — accessible in SQL but NOT exposed to Edge Functions).
--
-- SECURITY: EXECUTE is revoked from PUBLIC and only granted to
-- service_role, so the function is callable only from server-side
-- Edge Functions. Anon/authenticated users cannot invoke it.
-- ============================================================

CREATE OR REPLACE FUNCTION _private_sign_jwt(payload jsonb)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_secret   text;
  v_header   text;
  v_payload  text;
  v_unsigned text;
  v_sig      text;
BEGIN
  v_secret := current_setting('app.settings.jwt_secret', true);
  IF v_secret IS NULL OR v_secret = '' THEN
    RAISE EXCEPTION 'app.settings.jwt_secret is not configured';
  END IF;

  -- base64url helper: strip newlines, strip padding, swap chars
  v_header := replace(replace(
    rtrim(replace(encode(convert_to('{"alg":"HS256","typ":"JWT"}', 'utf8'), 'base64'), chr(10), ''), '='),
    '+', '-'), '/', '_');

  -- PostgreSQL's jsonb::text is canonical (keys sorted, no trailing space).
  -- The exact bytes don't matter as long as they are consistent with what
  -- we sign and what the verifier (PostgREST) receives.
  v_payload := replace(replace(
    rtrim(replace(encode(convert_to(payload::text, 'utf8'), 'base64'), chr(10), ''), '='),
    '+', '-'), '/', '_');

  v_unsigned := v_header || '.' || v_payload;

  v_sig := replace(replace(
    rtrim(replace(encode(hmac(v_unsigned::bytea, v_secret::bytea, 'sha256'), 'base64'), chr(10), ''), '='),
    '+', '-'), '/', '_');

  RETURN v_unsigned || '.' || v_sig;
END;
$$;

-- Only service_role (used by Edge Functions via SUPABASE_SERVICE_ROLE_KEY)
-- may execute this function.
REVOKE ALL ON FUNCTION _private_sign_jwt(jsonb) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION _private_sign_jwt(jsonb) TO service_role;
