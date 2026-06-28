ALTER TABLE profiles ADD COLUMN IF NOT EXISTS phone text NOT NULL DEFAULT '';

CREATE INDEX IF NOT EXISTS idx_profiles_phone ON profiles(phone);

CREATE OR REPLACE FUNCTION get_email_by_phone(p_phone text)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_email text;
BEGIN
  SELECT email INTO v_email FROM profiles
  WHERE phone = p_phone AND role = 'student' LIMIT 1;
  RETURN v_email;
END;
$$;

CREATE OR REPLACE FUNCTION get_admin_email()
RETURNS text LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_email text;
BEGIN
  SELECT email INTO v_email FROM profiles WHERE role = 'admin' LIMIT 1;
  RETURN v_email;
END;
$$;

GRANT EXECUTE ON FUNCTION get_email_by_phone(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_admin_email() TO anon, authenticated;