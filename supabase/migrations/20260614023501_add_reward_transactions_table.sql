CREATE TABLE IF NOT EXISTS reward_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  amount integer NOT NULL,
  reason text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE reward_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "select_own_reward_transactions" ON reward_transactions FOR SELECT
  TO authenticated USING (auth.uid() = student_id);

CREATE POLICY "insert_reward_transactions" ON reward_transactions FOR INSERT
  TO authenticated WITH CHECK (true);

CREATE POLICY "update_reward_transactions" ON reward_transactions FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "delete_reward_transactions" ON reward_transactions FOR DELETE
  TO authenticated USING (true);
