ALTER TABLE registrations DROP CONSTRAINT registrations_status_check;
ALTER TABLE registrations ADD CONSTRAINT registrations_status_check
  CHECK (status = ANY (ARRAY['pending','approved','rejected','refund_requested','refunded']));