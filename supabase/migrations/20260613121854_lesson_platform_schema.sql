/*
# Lesson Management & Game Platform — Full Schema

## Overview
Complete schema for an independent lesson management and gaming platform.
No third-party calendar/form tools. Supabase is the only backend.

## New Tables

### profiles
Extends auth.users. Stores role (admin/student), approval status, ticket count,
points, expiry date, and payment/refund metadata.

### lesson_applications
Public lesson inquiry form. Stores applicant info + answers before approval.
Linked to auth.users once approved.

### time_slots
Admin-managed available lesson time slots. One booking per slot (first-come-first-served).

### reservations
Student lesson bookings. Tracks cancellation penalties automatically.

### extensions
Student extension requests with admin approval workflow.

### points_history
Immutable log of every point transaction (game, admin, penalties, resets).

### ranking_backup
Monthly snapshot of ranking before reset.

### notifications
Internal notification log for all platform events.

## Security
- RLS enabled on all tables.
- Admin role checked via profiles.role = 'admin'.
- Students can only access their own data.
- Public can INSERT lesson_applications (no auth required).
*/

-- ============================================================
-- PROFILES (extends auth.users)
-- ============================================================
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  full_name text NOT NULL DEFAULT '',
  role text NOT NULL DEFAULT 'student' CHECK (role IN ('admin', 'student')),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'suspended')),
  tickets integer NOT NULL DEFAULT 0,
  points integer NOT NULL DEFAULT 0,
  expiry_date timestamptz,
  payment_amount integer NOT NULL DEFAULT 0,
  unit_price integer NOT NULL DEFAULT 0,
  discord_webhook text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_select_own" ON profiles;
CREATE POLICY "profiles_select_own" ON profiles FOR SELECT
TO authenticated USING (auth.uid() = id OR EXISTS (
  SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'
));

DROP POLICY IF EXISTS "profiles_insert_own" ON profiles;
CREATE POLICY "profiles_insert_own" ON profiles FOR INSERT
TO authenticated WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_update_own" ON profiles;
CREATE POLICY "profiles_update_own" ON profiles FOR UPDATE
TO authenticated USING (
  auth.uid() = id OR EXISTS (
    SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'
  )
) WITH CHECK (
  auth.uid() = id OR EXISTS (
    SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'
  )
);

DROP POLICY IF EXISTS "profiles_delete_admin" ON profiles;
CREATE POLICY "profiles_delete_admin" ON profiles FOR DELETE
TO authenticated USING (
  EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
);

-- ============================================================
-- LESSON APPLICATIONS (public form)
-- ============================================================
CREATE TABLE IF NOT EXISTS lesson_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name text NOT NULL,
  email text NOT NULL,
  phone text NOT NULL DEFAULT '',
  age text NOT NULL DEFAULT '',
  experience text NOT NULL DEFAULT '',
  goals text NOT NULL DEFAULT '',
  preferred_schedule text NOT NULL DEFAULT '',
  questions text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting', 'approved', 'rejected')),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE lesson_applications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "applications_anon_insert" ON lesson_applications;
CREATE POLICY "applications_anon_insert" ON lesson_applications FOR INSERT
TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "applications_select_admin" ON lesson_applications;
CREATE POLICY "applications_select_admin" ON lesson_applications FOR SELECT
TO authenticated USING (
  EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  OR auth.uid() = user_id
);

DROP POLICY IF EXISTS "applications_update_admin" ON lesson_applications;
CREATE POLICY "applications_update_admin" ON lesson_applications FOR UPDATE
TO authenticated USING (
  EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
) WITH CHECK (
  EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
);

DROP POLICY IF EXISTS "applications_delete_admin" ON lesson_applications;
CREATE POLICY "applications_delete_admin" ON lesson_applications FOR DELETE
TO authenticated USING (
  EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
);

-- ============================================================
-- TIME SLOTS (admin-managed)
-- ============================================================
CREATE TABLE IF NOT EXISTS time_slots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slot_date date NOT NULL,
  start_time time NOT NULL,
  end_time time NOT NULL,
  is_available boolean NOT NULL DEFAULT true,
  booked_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE time_slots ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "slots_select_auth" ON time_slots;
CREATE POLICY "slots_select_auth" ON time_slots FOR SELECT
TO authenticated USING (true);

DROP POLICY IF EXISTS "slots_insert_admin" ON time_slots;
CREATE POLICY "slots_insert_admin" ON time_slots FOR INSERT
TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
);

DROP POLICY IF EXISTS "slots_update_auth" ON time_slots;
CREATE POLICY "slots_update_auth" ON time_slots FOR UPDATE
TO authenticated USING (
  EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  OR (booked_by IS NULL AND is_available = true)
) WITH CHECK (
  EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  OR (booked_by = auth.uid())
);

DROP POLICY IF EXISTS "slots_delete_admin" ON time_slots;
CREATE POLICY "slots_delete_admin" ON time_slots FOR DELETE
TO authenticated USING (
  EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
);

-- ============================================================
-- RESERVATIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS reservations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  slot_id uuid NOT NULL REFERENCES time_slots(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'confirmed' CHECK (status IN ('confirmed', 'cancelled', 'completed', 'noshow')),
  cancelled_at timestamptz,
  penalty_points integer NOT NULL DEFAULT 0,
  ticket_refunded boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE reservations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "reservations_select" ON reservations;
CREATE POLICY "reservations_select" ON reservations FOR SELECT
TO authenticated USING (
  auth.uid() = user_id OR EXISTS (
    SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'
  )
);

DROP POLICY IF EXISTS "reservations_insert" ON reservations;
CREATE POLICY "reservations_insert" ON reservations FOR INSERT
TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "reservations_update" ON reservations;
CREATE POLICY "reservations_update" ON reservations FOR UPDATE
TO authenticated USING (
  auth.uid() = user_id OR EXISTS (
    SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'
  )
) WITH CHECK (
  auth.uid() = user_id OR EXISTS (
    SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'
  )
);

DROP POLICY IF EXISTS "reservations_delete_admin" ON reservations;
CREATE POLICY "reservations_delete_admin" ON reservations FOR DELETE
TO authenticated USING (
  EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
);

-- ============================================================
-- EXTENSIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS extensions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  reason text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  days_requested integer NOT NULL DEFAULT 7,
  admin_note text,
  created_at timestamptz DEFAULT now(),
  resolved_at timestamptz
);

ALTER TABLE extensions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "extensions_select" ON extensions;
CREATE POLICY "extensions_select" ON extensions FOR SELECT
TO authenticated USING (
  auth.uid() = user_id OR EXISTS (
    SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'
  )
);

DROP POLICY IF EXISTS "extensions_insert" ON extensions;
CREATE POLICY "extensions_insert" ON extensions FOR INSERT
TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "extensions_update_admin" ON extensions;
CREATE POLICY "extensions_update_admin" ON extensions FOR UPDATE
TO authenticated USING (
  EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
) WITH CHECK (
  EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
);

DROP POLICY IF EXISTS "extensions_delete_admin" ON extensions;
CREATE POLICY "extensions_delete_admin" ON extensions FOR DELETE
TO authenticated USING (
  EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
);

-- ============================================================
-- POINTS HISTORY
-- ============================================================
CREATE TABLE IF NOT EXISTS points_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  delta integer NOT NULL,
  reason text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE points_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "points_history_select" ON points_history;
CREATE POLICY "points_history_select" ON points_history FOR SELECT
TO authenticated USING (
  auth.uid() = user_id OR EXISTS (
    SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'
  )
);

DROP POLICY IF EXISTS "points_history_insert_admin" ON points_history;
CREATE POLICY "points_history_insert_admin" ON points_history FOR INSERT
TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  OR auth.uid() = user_id
);

DROP POLICY IF EXISTS "points_history_update_admin" ON points_history;
CREATE POLICY "points_history_update_admin" ON points_history FOR UPDATE
TO authenticated USING (
  EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
) WITH CHECK (
  EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
);

DROP POLICY IF EXISTS "points_history_delete_admin" ON points_history;
CREATE POLICY "points_history_delete_admin" ON points_history FOR DELETE
TO authenticated USING (
  EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
);

-- ============================================================
-- RANKING BACKUP (monthly snapshots)
-- ============================================================
CREATE TABLE IF NOT EXISTS ranking_backup (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  points integer NOT NULL,
  rank_position integer,
  snapshot_month text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE ranking_backup ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ranking_backup_select" ON ranking_backup;
CREATE POLICY "ranking_backup_select" ON ranking_backup FOR SELECT
TO authenticated USING (true);

DROP POLICY IF EXISTS "ranking_backup_insert_admin" ON ranking_backup;
CREATE POLICY "ranking_backup_insert_admin" ON ranking_backup FOR INSERT
TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
);

DROP POLICY IF EXISTS "ranking_backup_update_admin" ON ranking_backup;
CREATE POLICY "ranking_backup_update_admin" ON ranking_backup FOR UPDATE
TO authenticated USING (
  EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
) WITH CHECK (
  EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
);

DROP POLICY IF EXISTS "ranking_backup_delete_admin" ON ranking_backup;
CREATE POLICY "ranking_backup_delete_admin" ON ranking_backup FOR DELETE
TO authenticated USING (
  EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
);

-- ============================================================
-- NOTIFICATIONS LOG
-- ============================================================
CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL,
  title text NOT NULL,
  body text NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "notifications_select" ON notifications;
CREATE POLICY "notifications_select" ON notifications FOR SELECT
TO authenticated USING (
  auth.uid() = user_id OR user_id IS NULL OR EXISTS (
    SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'
  )
);

DROP POLICY IF EXISTS "notifications_insert" ON notifications;
CREATE POLICY "notifications_insert" ON notifications FOR INSERT
TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "notifications_update" ON notifications;
CREATE POLICY "notifications_update" ON notifications FOR UPDATE
TO authenticated USING (
  auth.uid() = user_id OR EXISTS (
    SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'
  )
) WITH CHECK (
  auth.uid() = user_id OR EXISTS (
    SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'
  )
);

DROP POLICY IF EXISTS "notifications_delete_admin" ON notifications;
CREATE POLICY "notifications_delete_admin" ON notifications FOR DELETE
TO authenticated USING (
  EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
);

-- ============================================================
-- PLATFORM CONFIG (discord webhook, settings)
-- ============================================================
CREATE TABLE IF NOT EXISTS platform_config (
  key text PRIMARY KEY,
  value text NOT NULL,
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE platform_config ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "config_select_admin" ON platform_config;
CREATE POLICY "config_select_admin" ON platform_config FOR SELECT
TO authenticated USING (
  EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
);

DROP POLICY IF EXISTS "config_insert_admin" ON platform_config;
CREATE POLICY "config_insert_admin" ON platform_config FOR INSERT
TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
);

DROP POLICY IF EXISTS "config_update_admin" ON platform_config;
CREATE POLICY "config_update_admin" ON platform_config FOR UPDATE
TO authenticated USING (
  EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
) WITH CHECK (
  EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
);

DROP POLICY IF EXISTS "config_delete_admin" ON platform_config;
CREATE POLICY "config_delete_admin" ON platform_config FOR DELETE
TO authenticated USING (
  EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
);

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_status ON profiles(status);
CREATE INDEX IF NOT EXISTS idx_time_slots_date ON time_slots(slot_date);
CREATE INDEX IF NOT EXISTS idx_reservations_user ON reservations(user_id);
CREATE INDEX IF NOT EXISTS idx_reservations_slot ON reservations(slot_id);
CREATE INDEX IF NOT EXISTS idx_extensions_user ON extensions(user_id);
CREATE INDEX IF NOT EXISTS idx_extensions_status ON extensions(status);
CREATE INDEX IF NOT EXISTS idx_points_history_user ON points_history(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);

-- ============================================================
-- TRIGGER: auto-create profile on signup
-- ============================================================
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO profiles (id, email, full_name, role, status)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'role', 'student'),
    CASE WHEN COALESCE(NEW.raw_user_meta_data->>'role', 'student') = 'admin' THEN 'active' ELSE 'pending' END
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================================
-- RPC: apply penalty and return ticket if needed
-- ============================================================
CREATE OR REPLACE FUNCTION apply_cancellation_penalty(
  p_reservation_id uuid,
  p_user_id uuid,
  p_penalty_points integer,
  p_return_ticket boolean
)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE reservations
  SET status = 'cancelled',
      cancelled_at = now(),
      penalty_points = p_penalty_points,
      ticket_refunded = p_return_ticket
  WHERE id = p_reservation_id;

  UPDATE time_slots
  SET is_available = true, booked_by = NULL
  WHERE id = (SELECT slot_id FROM reservations WHERE id = p_reservation_id);

  IF p_penalty_points > 0 THEN
    UPDATE profiles SET points = GREATEST(0, points - p_penalty_points) WHERE id = p_user_id;
    INSERT INTO points_history (user_id, delta, reason)
    VALUES (p_user_id, -p_penalty_points, '취소 패널티');
  END IF;

  IF p_return_ticket THEN
    UPDATE profiles SET tickets = tickets + 1 WHERE id = p_user_id;
  END IF;
END;
$$;

-- ============================================================
-- RPC: monthly points reset + backup
-- ============================================================
CREATE OR REPLACE FUNCTION monthly_points_reset()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  snapshot_month text := to_char(now(), 'YYYY-MM');
  r RECORD;
  rank_num integer := 0;
BEGIN
  FOR r IN
    SELECT id, full_name, points
    FROM profiles
    WHERE role = 'student' AND points > 0
    ORDER BY points DESC
  LOOP
    rank_num := rank_num + 1;
    INSERT INTO ranking_backup (user_id, full_name, points, rank_position, snapshot_month)
    VALUES (r.id, r.full_name, r.points, rank_num, snapshot_month);
  END LOOP;

  UPDATE profiles SET points = 0 WHERE role = 'student';
  INSERT INTO points_history (user_id, delta, reason)
  SELECT id, -points, '월간 초기화'
  FROM profiles
  WHERE role = 'student' AND points > 0;
END;
$$;

-- ============================================================
-- RPC: approve student (set active + add tickets + set expiry)
-- ============================================================
CREATE OR REPLACE FUNCTION approve_student(
  p_user_id uuid,
  p_tickets integer,
  p_payment_amount integer,
  p_unit_price integer
)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE profiles
  SET status = 'active',
      tickets = p_tickets,
      expiry_date = now() + INTERVAL '30 days',
      payment_amount = p_payment_amount,
      unit_price = p_unit_price,
      updated_at = now()
  WHERE id = p_user_id;
END;
$$;

-- ============================================================
-- RPC: adjust user points (admin)
-- ============================================================
CREATE OR REPLACE FUNCTION adjust_user_points(
  p_user_id uuid,
  p_delta integer,
  p_reason text
)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE profiles
  SET points = GREATEST(0, points + p_delta)
  WHERE id = p_user_id;

  INSERT INTO points_history (user_id, delta, reason)
  VALUES (p_user_id, p_delta, p_reason);
END;
$$;
