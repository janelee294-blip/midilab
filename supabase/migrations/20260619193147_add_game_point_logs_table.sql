CREATE TABLE game_point_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  game_id text NOT NULL,
  sub_key text NOT NULL,
  points int NOT NULL,
  awarded_at timestamptz DEFAULT now()
);

CREATE INDEX idx_game_point_logs_user ON game_point_logs(user_id);
CREATE INDEX idx_game_point_logs_lookup ON game_point_logs(user_id, game_id, sub_key);
CREATE INDEX idx_game_point_logs_awarded ON game_point_logs(user_id, game_id, awarded_at);

GRANT ALL ON game_point_logs TO anon, authenticated;