-- Atomically consume one MyStudio ticket and create the corresponding pending work.
CREATE OR REPLACE FUNCTION public.use_studio_ticket(p_item_key text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_user_id uuid := auth.uid();
  v_full_name text;
  v_inventory jsonb;
  v_item_count integer;
  v_product_name text;
  v_parse_attempt integer;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION '로그인이 필요합니다.';
  END IF;

  v_product_name := CASE p_item_key
    WHEN 'ticket_release' THEN '[아이템 사용] 유통사 계약서'
    WHEN 'ticket_mix' THEN '[아이템 사용] 엔지니어링 티켓'
    ELSE NULL
  END;

  IF v_product_name IS NULL THEN
    RAISE EXCEPTION '사용할 수 없는 특수 아이템입니다.';
  END IF;

  SELECT
    p.full_name,
    COALESCE(p.inventory::jsonb, '{}'::jsonb)
  INTO
    v_full_name,
    v_inventory
  FROM public.profiles AS p
  WHERE p.id = v_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION '사용자 프로필을 찾을 수 없습니다.';
  END IF;

  -- MyStudio supports legacy inventories that were JSON-stringified more than once.
  FOR v_parse_attempt IN 1..4 LOOP
    EXIT WHEN jsonb_typeof(v_inventory) IS DISTINCT FROM 'string';

    BEGIN
      v_inventory := (v_inventory #>> '{}')::jsonb;
    EXCEPTION
      WHEN invalid_text_representation THEN
        RAISE EXCEPTION '인벤토리 데이터가 올바르지 않습니다.';
    END;
  END LOOP;

  IF jsonb_typeof(v_inventory) IS DISTINCT FROM 'object' THEN
    RAISE EXCEPTION '인벤토리 데이터가 올바르지 않습니다.';
  END IF;

  BEGIN
    v_item_count := COALESCE((v_inventory ->> p_item_key)::integer, 0);
  EXCEPTION
    WHEN invalid_text_representation THEN
      RAISE EXCEPTION '티켓 수량 데이터가 올바르지 않습니다.';
  END;

  IF v_item_count <= 0 THEN
    RAISE EXCEPTION '보유한 티켓이 없습니다.';
  END IF;

  IF v_item_count = 1 THEN
    v_inventory := v_inventory - p_item_key;
  ELSE
    v_inventory := jsonb_set(
      v_inventory,
      ARRAY[p_item_key],
      to_jsonb(v_item_count - 1),
      false
    );
  END IF;

  UPDATE public.profiles AS p
  SET inventory = v_inventory
  WHERE p.id = v_user_id;

  INSERT INTO public.project_works (
    registration_id,
    student_id,
    student_name,
    product_name,
    status,
    price
  )
  VALUES (
    NULL,
    v_user_id,
    COALESCE(v_full_name, ''),
    v_product_name,
    'pending',
    0
  );

  RETURN v_inventory;
END;
$function$;

REVOKE EXECUTE
ON FUNCTION public.use_studio_ticket(text)
FROM PUBLIC, anon;

GRANT EXECUTE
ON FUNCTION public.use_studio_ticket(text)
TO authenticated;
