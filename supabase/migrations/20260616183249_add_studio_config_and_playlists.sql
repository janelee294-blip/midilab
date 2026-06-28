-- Studio environment config stored in platform_config as JSON
-- Key: 'studio_env'
-- Value example:
-- {
--   "mode": "auto" | "manual",
--   "time": "morning" | "afternoon" | "evening" | "night",
--   "weather": "sunny" | "cloudy" | "rainy",
--   "theme": "default" | "spring" | "summer" | "autumn" | "winter" | "christmas" | "halloween"
-- }

-- Studio playlists table
CREATE TABLE IF NOT EXISTS studio_playlists (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title       text NOT NULL,
  url         text NOT NULL,
  season_tag  text NOT NULL DEFAULT 'all',  -- 'all', 'spring', 'summer', 'autumn', 'winter', 'christmas', 'halloween'
  sort_order  integer NOT NULL DEFAULT 0,
  is_active   boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE studio_playlists ENABLE ROW LEVEL SECURITY;

-- Students can read active playlists; admin writes via service role
CREATE POLICY "read_active_playlists" ON studio_playlists
  FOR SELECT TO authenticated USING (is_active = true);

-- Seed a default playlist entry (YouTube lofi)
INSERT INTO studio_playlists (title, url, season_tag, sort_order)
VALUES
  ('Lofi Hip Hop Radio',        'https://www.youtube.com/embed/jfKfPfyJRdk?autoplay=1&loop=1', 'all',    0),
  ('Rainy Day Jazz',            'https://www.youtube.com/embed/Dx5qFachd3A?autoplay=1&loop=1', 'all',    1),
  ('Studio Focus Beats',        'https://www.youtube.com/embed/5qap5aO4i9A?autoplay=1&loop=1', 'all',    2),
  ('Winter Cozy Lofi',          'https://www.youtube.com/embed/ggqzh_5WL44?autoplay=1&loop=1', 'winter', 0);
