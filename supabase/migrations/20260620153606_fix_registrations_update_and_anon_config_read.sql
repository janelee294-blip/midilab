-- ── Fix 1: 환불 신청 ─────────────────────────────────────────────────────────
-- RefundRequest.tsx calls:
--   supabase.from('registrations').update({ status: 'refund_requested', refund_reason: ... })
-- The jwt_app_role_rls_policies migration added student_insert_own and student_select_own
-- on registrations, but NO student UPDATE policy. Students are blocked from changing their
-- own registration status to 'refund_requested'.
CREATE POLICY "student_update_own" ON registrations FOR UPDATE TO authenticated
  USING (
    auth.uid() = student_id
    AND (COALESCE(current_setting('request.jwt.claims', true), '{}')::jsonb ->> 'app_role') = 'student'
  )
  WITH CHECK (auth.uid() = student_id);

-- ── Fix 2: 레슨 신청 웹훅 ───────────────────────────────────────────────────
-- lesson_applications uses anon INSERT (applications_anon_insert kept from original schema).
-- After submission, sendDiscordNotification() reads platform_config to get the admin
-- Discord webhook URL. The anon role has no SELECT policy on platform_config, so the
-- fetch returns null and the notification is silently dropped.
-- platform_config contains only non-sensitive values (webhook URLs, BI config).
CREATE POLICY "anon_select_config" ON platform_config FOR SELECT TO anon
  USING (true);
