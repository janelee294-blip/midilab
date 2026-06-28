-- points_history.user_id was referencing auth.users(id),
-- but this app uses custom phone auth (profiles table, not Supabase Auth).
-- FK violations caused adjust_user_points to always roll back → no points ever awarded.

-- 1. Remove orphaned rows (user_id not in profiles) before changing constraint
DELETE FROM points_history WHERE user_id NOT IN (SELECT id FROM profiles);

-- 2. Drop the old FK referencing auth.users
ALTER TABLE points_history
  DROP CONSTRAINT IF EXISTS points_history_user_id_fkey;

-- 3. Add new FK referencing profiles
ALTER TABLE points_history
  ADD CONSTRAINT points_history_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;