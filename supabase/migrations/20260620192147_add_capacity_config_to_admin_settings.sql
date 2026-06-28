-- Seed capacity_config row in admin_settings.
-- Stores three numeric fields used by the Capacity Analysis card:
--   sessionTime  (회당 소요 시간, hours)
--   desiredHours (희망 할당 시간, hours/month)
--   maxHours     (최대 가능 시간, hours/month)
-- Values are stored as JSON numbers (numeric precision) in the existing JSONB value column.
INSERT INTO admin_settings (key, value)
VALUES ('capacity_config', '{"sessionTime": null, "desiredHours": null, "maxHours": null}')
ON CONFLICT (key) DO NOTHING;
