-- 1. Add password column
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS password text NOT NULL DEFAULT '';

-- 2. Set passwords for existing accounts
UPDATE profiles SET password = '123456' WHERE role = 'admin';
UPDATE profiles SET password = '1234' WHERE phone = '01041011477';

-- 3. Drop FK constraints referencing auth.users
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_id_fkey;
ALTER TABLE lesson_applications DROP CONSTRAINT IF EXISTS lesson_applications_user_id_fkey;
ALTER TABLE reservations DROP CONSTRAINT IF EXISTS reservations_user_id_fkey;
ALTER TABLE extensions DROP CONSTRAINT IF EXISTS extensions_user_id_fkey;
ALTER TABLE points_history DROP CONSTRAINT IF EXISTS points_history_user_id_fkey;
ALTER TABLE ranking_backup DROP CONSTRAINT IF EXISTS ranking_backup_user_id_fkey;
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_user_id_fkey;
ALTER TABLE time_slots DROP CONSTRAINT IF EXISTS time_slots_booked_by_fkey;

-- 4. Remove auth.uid() defaults
ALTER TABLE reservations ALTER COLUMN user_id DROP DEFAULT;
ALTER TABLE extensions ALTER COLUMN user_id DROP DEFAULT;

-- 5. Disable RLS on all tables
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE time_slots DISABLE ROW LEVEL SECURITY;
ALTER TABLE reservations DISABLE ROW LEVEL SECURITY;
ALTER TABLE extensions DISABLE ROW LEVEL SECURITY;
ALTER TABLE points_history DISABLE ROW LEVEL SECURITY;
ALTER TABLE ranking_backup DISABLE ROW LEVEL SECURITY;
ALTER TABLE notifications DISABLE ROW LEVEL SECURITY;
ALTER TABLE platform_config DISABLE ROW LEVEL SECURITY;
ALTER TABLE lesson_applications DISABLE ROW LEVEL SECURITY;

-- 6. Create login RPCs callable by anon
CREATE OR REPLACE FUNCTION login_by_phone(p_phone text, p_password text)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_profile json;
BEGIN
  SELECT row_to_json(p.*) INTO v_profile
  FROM profiles p
  WHERE p.phone = p_phone AND p.password = p_password AND p.role = 'student'
  LIMIT 1;
  RETURN v_profile;
END;
$$;

CREATE OR REPLACE FUNCTION login_admin_bypass(p_password text)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_profile json;
BEGIN
  SELECT row_to_json(p.*) INTO v_profile
  FROM profiles p
  WHERE p.role = 'admin' AND p.password = p_password
  LIMIT 1;
  RETURN v_profile;
END;
$$;

GRANT EXECUTE ON FUNCTION login_by_phone(text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION login_admin_bypass(text) TO anon, authenticated;