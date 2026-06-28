-- Add net_amount to reservations for per-lesson revenue tracking
ALTER TABLE reservations ADD COLUMN IF NOT EXISTS net_amount integer;

-- Financial events: unified ledger for revenue / cost / deferred_cost
CREATE TABLE IF NOT EXISTS financial_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('revenue', 'cost', 'deferred_cost')),
  amount integer NOT NULL,
  apply_month text,
  source text CHECK (source IN ('task', 'league', 'manual', 'refund', 'reward', 'subscription')),
  note text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE financial_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "select_financial_events" ON financial_events FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "insert_financial_events" ON financial_events FOR INSERT
  TO authenticated WITH CHECK (true);

CREATE POLICY "update_financial_events" ON financial_events FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "delete_financial_events" ON financial_events FOR DELETE
  TO authenticated USING (true);

CREATE INDEX IF NOT EXISTS financial_events_type_idx ON financial_events (type);
CREATE INDEX IF NOT EXISTS financial_events_apply_month_idx ON financial_events (apply_month);
CREATE INDEX IF NOT EXISTS financial_events_student_id_idx ON financial_events (student_id);
CREATE INDEX IF NOT EXISTS financial_events_created_at_idx ON financial_events (created_at);
