-- Support decimal point values (e.g. 0.5 per sub-level)
ALTER TABLE game_point_logs ALTER COLUMN points TYPE numeric(10,1);
ALTER TABLE profiles ALTER COLUMN points TYPE numeric(10,1);
ALTER TABLE points_history ALTER COLUMN delta TYPE numeric(10,1);

CREATE OR REPLACE FUNCTION adjust_user_points(
  p_user_id uuid,
  p_delta numeric,
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
