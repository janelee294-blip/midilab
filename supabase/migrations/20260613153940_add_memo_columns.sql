
ALTER TABLE lesson_applications ADD COLUMN IF NOT EXISTS memo text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS memo text;
