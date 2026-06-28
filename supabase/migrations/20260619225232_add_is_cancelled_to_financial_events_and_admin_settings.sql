-- Soft-cancel for financial_events (no physical DELETE ever)
ALTER TABLE financial_events ADD COLUMN IF NOT EXISTS is_cancelled boolean NOT NULL DEFAULT false;
CREATE INDEX IF NOT EXISTS idx_financial_events_cancelled ON financial_events(is_cancelled);

-- Persistent admin settings (BEP, targets, etc.)
CREATE TABLE IF NOT EXISTS admin_settings (
  key text PRIMARY KEY,
  value jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE admin_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_settings_select" ON admin_settings FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "admin_settings_insert" ON admin_settings FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "admin_settings_update" ON admin_settings FOR UPDATE
  TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));
