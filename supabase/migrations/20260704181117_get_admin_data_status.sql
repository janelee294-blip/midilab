-- Return read-only database status metrics to authenticated administrators.
CREATE OR REPLACE FUNCTION public.get_admin_data_status()
RETURNS TABLE (
  database_size_bytes bigint,
  database_size_pretty text,
  student_count bigint,
  reservation_count bigint,
  time_slot_count bigint,
  notification_count bigint,
  old_notification_count bigint,
  studio_visit_count bigint,
  checked_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_admin_role text;
  v_database_size_bytes bigint;
  v_studio_visit_count bigint := 0;
BEGIN
  SELECT p.role
  INTO v_admin_role
  FROM public.profiles AS p
  WHERE p.id = auth.uid();

  IF v_admin_role IS DISTINCT FROM 'admin' THEN
    RAISE EXCEPTION 'Only administrators can view database status';
  END IF;

  v_database_size_bytes :=
    pg_catalog.pg_database_size(pg_catalog.current_database());

  IF pg_catalog.to_regclass('public.studio_visits') IS NOT NULL THEN
    EXECUTE 'SELECT count(*)::bigint FROM public.studio_visits'
    INTO v_studio_visit_count;
  END IF;

  RETURN QUERY
  SELECT
    v_database_size_bytes,
    pg_catalog.pg_size_pretty(v_database_size_bytes),
    (
      SELECT count(*)::bigint
      FROM public.profiles AS p
      WHERE p.role = 'student'
    ),
    (
      SELECT count(*)::bigint
      FROM public.reservations
    ),
    (
      SELECT count(*)::bigint
      FROM public.time_slots
    ),
    (
      SELECT count(*)::bigint
      FROM public.notifications
    ),
    (
      SELECT count(*)::bigint
      FROM public.notifications AS n
      WHERE n.created_at < pg_catalog.now() - interval '90 days'
        AND n.type IN ('reservation', 'cancellation')
        AND n.user_id IS NOT NULL
    ),
    v_studio_visit_count,
    pg_catalog.now();
END;
$function$;

REVOKE EXECUTE
ON FUNCTION public.get_admin_data_status()
FROM PUBLIC, anon;

GRANT EXECUTE
ON FUNCTION public.get_admin_data_status()
TO authenticated;
