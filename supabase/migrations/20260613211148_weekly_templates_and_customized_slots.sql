CREATE TABLE IF NOT EXISTS weekly_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  day_of_week int NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
  start_time time NOT NULL,
  end_time time NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE time_slots ADD COLUMN IF NOT EXISTS is_customized boolean NOT NULL DEFAULT false;