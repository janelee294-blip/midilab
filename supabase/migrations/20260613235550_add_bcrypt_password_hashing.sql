-- 1. Enable pgcrypto for bcrypt
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 2. Trigger function: auto-hash plain text passwords before INSERT/UPDATE
CREATE OR REPLACE FUNCTION auto_hash_password()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.password IS NOT NULL AND NEW.password <> ''
     AND LEFT(NEW.password, 2) <> '$2' THEN
    NEW.password := crypt(NEW.password, gen_salt('bf', 10));
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_hash_password ON profiles;
CREATE TRIGGER trg_hash_password
  BEFORE INSERT OR UPDATE OF password ON profiles
  FOR EACH ROW EXECUTE FUNCTION auto_hash_password();

-- 3. Re-hash all existing plain text passwords in one pass
UPDATE profiles
SET password = crypt(password, gen_salt('bf', 10))
WHERE password <> '' AND LEFT(password, 2) <> '$2';

-- 4. Update login_by_phone to use bcrypt comparison
CREATE OR REPLACE FUNCTION login_by_phone(p_phone text, p_password text)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_profile json;
BEGIN
  SELECT row_to_json(p.*) INTO v_profile
  FROM profiles p
  WHERE p.phone = p_phone
    AND p.role = 'student'
    AND p.password <> ''
    AND crypt(p_password, p.password) = p.password
  LIMIT 1;
  RETURN v_profile;
END;
$$;

-- 5. Update login_admin_bypass to use bcrypt comparison
CREATE OR REPLACE FUNCTION login_admin_bypass(p_password text)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_profile json;
BEGIN
  SELECT row_to_json(p.*) INTO v_profile
  FROM profiles p
  WHERE p.role = 'admin'
    AND p.password <> ''
    AND crypt(p_password, p.password) = p.password
  LIMIT 1;
  RETURN v_profile;
END;
$$;

-- 6. New RPC: verify current password (used by PasswordChange component)
CREATE OR REPLACE FUNCTION verify_current_password(p_user_id uuid, p_password text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_hash text;
BEGIN
  SELECT password INTO v_hash FROM profiles WHERE id = p_user_id;
  IF v_hash IS NULL OR v_hash = '' THEN RETURN false; END IF;
  RETURN crypt(p_password, v_hash) = v_hash;
END;
$$;

GRANT EXECUTE ON FUNCTION verify_current_password(uuid, text) TO anon, authenticated;
