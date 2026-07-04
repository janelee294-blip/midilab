-- Allow an authenticated administrator to book an available lesson slot
-- for an active student in one atomic database operation.
CREATE OR REPLACE FUNCTION public.admin_book_slot_for_student(
  p_slot_id uuid,
  p_student_id uuid
)
RETURNS TABLE (
  reservation_id uuid,
  slot_id uuid,
  user_id uuid,
  slot_date date,
  start_time time,
  end_time time,
  remaining_tickets integer
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_admin_role text;
  v_slot public.time_slots%ROWTYPE;
  v_student public.profiles%ROWTYPE;
  v_reservation_id uuid;
  v_remaining_tickets integer;
  v_updated_rows integer;
BEGIN
  SELECT p.role
  INTO v_admin_role
  FROM public.profiles AS p
  WHERE p.id = auth.uid();

  IF v_admin_role IS DISTINCT FROM 'admin' THEN
    RAISE EXCEPTION 'Only administrators can book slots for students';
  END IF;

  SELECT ts.*
  INTO v_slot
  FROM public.time_slots AS ts
  WHERE ts.id = p_slot_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Time slot not found';
  END IF;

  IF v_slot.is_available IS NOT TRUE THEN
    RAISE EXCEPTION 'Time slot is not available';
  END IF;

  IF v_slot.booked_by IS NOT NULL THEN
    RAISE EXCEPTION 'Time slot is already booked';
  END IF;

  SELECT p.*
  INTO v_student
  FROM public.profiles AS p
  WHERE p.id = p_student_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Student profile not found';
  END IF;

  IF v_student.role IS DISTINCT FROM 'student' THEN
    RAISE EXCEPTION 'Selected profile is not a student';
  END IF;

  IF v_student.status IS DISTINCT FROM 'active' THEN
    RAISE EXCEPTION 'Student profile is not active';
  END IF;

  IF v_student.tickets <= 0 THEN
    RAISE EXCEPTION 'Student has no remaining tickets';
  END IF;

  IF v_student.expiry_date IS NOT NULL
     AND v_student.expiry_date::date < CURRENT_DATE THEN
    RAISE EXCEPTION 'Student lesson period has expired';
  END IF;

  INSERT INTO public.reservations (
    user_id,
    slot_id,
    status
  )
  VALUES (
    p_student_id,
    p_slot_id,
    'confirmed'
  )
  RETURNING id INTO v_reservation_id;

  UPDATE public.time_slots AS ts
  SET
    is_available = false,
    booked_by = p_student_id
  WHERE ts.id = p_slot_id
    AND ts.is_available = true
    AND ts.booked_by IS NULL;

  GET DIAGNOSTICS v_updated_rows = ROW_COUNT;

  IF v_updated_rows <> 1 THEN
    RAISE EXCEPTION 'Time slot became unavailable while booking';
  END IF;

  UPDATE public.profiles AS p
  SET tickets = p.tickets - 1
  WHERE p.id = p_student_id
    AND p.tickets > 0
  RETURNING p.tickets INTO v_remaining_tickets;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Student ticket balance changed while booking';
  END IF;

  INSERT INTO public.notifications (
    type,
    title,
    body,
    user_id
  )
  VALUES (
    'reservation',
    'Lesson booked',
    format(
      'Lesson booked for %s on %s at %s.',
      v_student.full_name,
      v_slot.slot_date,
      to_char(v_slot.start_time, 'HH24:MI')
    ),
    p_student_id
  );

  RETURN QUERY
  SELECT
    v_reservation_id,
    p_slot_id,
    p_student_id,
    v_slot.slot_date,
    v_slot.start_time,
    v_slot.end_time,
    v_remaining_tickets;
END;
$function$;

REVOKE EXECUTE
ON FUNCTION public.admin_book_slot_for_student(uuid, uuid)
FROM PUBLIC, anon;

GRANT EXECUTE
ON FUNCTION public.admin_book_slot_for_student(uuid, uuid)
TO authenticated;
