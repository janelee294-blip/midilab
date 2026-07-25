-- 방 하나를 저장할 때 다른 방을 덮어쓰지 않도록
-- 작업실 방 배치를 방별 row로 분리한다.
CREATE TABLE IF NOT EXISTS public.studio_room_layouts (
  user_id uuid NOT NULL
    REFERENCES public.profiles(id)
    ON DELETE CASCADE,

  room_id text NOT NULL,

  layout jsonb NOT NULL
    DEFAULT '{}'::jsonb,

  revision bigint NOT NULL
    DEFAULT 1,

  created_at timestamptz NOT NULL
    DEFAULT now(),

  updated_at timestamptz NOT NULL
    DEFAULT now(),

  CONSTRAINT studio_room_layouts_pkey
    PRIMARY KEY (user_id, room_id),

  CONSTRAINT studio_room_layouts_room_id_check
    CHECK (
      room_id IN (
        'room_lv1',
        'room_lv2',
        'room_lv3'
      )
    ),

  CONSTRAINT studio_room_layouts_layout_object_check
    CHECK (
      jsonb_typeof(layout) = 'object'
    ),

  CONSTRAINT studio_room_layouts_revision_check
    CHECK (
      revision >= 1
    )
);


-- row 수정 시 updated_at 자동 갱신
CREATE OR REPLACE FUNCTION public.set_studio_room_layout_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog
AS $function$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$function$;


DROP TRIGGER IF EXISTS trg_studio_room_layouts_updated_at
ON public.studio_room_layouts;


CREATE TRIGGER trg_studio_room_layouts_updated_at
BEFORE UPDATE ON public.studio_room_layouts
FOR EACH ROW
EXECUTE FUNCTION public.set_studio_room_layout_updated_at();


-- RLS 활성화
ALTER TABLE public.studio_room_layouts
ENABLE ROW LEVEL SECURITY;


-- 기본 접근 권한 제한
REVOKE ALL
ON TABLE public.studio_room_layouts
FROM PUBLIC, anon;


GRANT SELECT, INSERT, UPDATE
ON TABLE public.studio_room_layouts
TO authenticated;


REVOKE ALL
ON FUNCTION public.set_studio_room_layout_updated_at()
FROM PUBLIC, anon, authenticated;


-- 본인 방 조회
DROP POLICY IF EXISTS "studio_room_layouts_select_own"
ON public.studio_room_layouts;


CREATE POLICY "studio_room_layouts_select_own"
ON public.studio_room_layouts
FOR SELECT
TO authenticated
USING (
  auth.uid() = user_id
);


-- 작업실 방문 기능:
-- 로그인한 학생은 활성 상태인 다른 학생의 작업실을 조회할 수 있다.
DROP POLICY IF EXISTS "studio_room_layouts_select_active_students"
ON public.studio_room_layouts;


CREATE POLICY "studio_room_layouts_select_active_students"
ON public.studio_room_layouts
FOR SELECT
TO authenticated
USING (
  (
    COALESCE(
      current_setting('request.jwt.claims', true),
      '{}'
    )::jsonb ->> 'app_role'
  ) = 'student'

  AND EXISTS (
    SELECT 1
    FROM public.profiles AS owner_profile
    WHERE owner_profile.id = studio_room_layouts.user_id
      AND owner_profile.role = 'student'
      AND owner_profile.status = 'active'
  )
);


-- 본인 방 row 생성
DROP POLICY IF EXISTS "studio_room_layouts_insert_own"
ON public.studio_room_layouts;


CREATE POLICY "studio_room_layouts_insert_own"
ON public.studio_room_layouts
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id
);


-- 본인 방 row 수정
DROP POLICY IF EXISTS "studio_room_layouts_update_own"
ON public.studio_room_layouts;


CREATE POLICY "studio_room_layouts_update_own"
ON public.studio_room_layouts
FOR UPDATE
TO authenticated
USING (
  auth.uid() = user_id
)
WITH CHECK (
  auth.uid() = user_id
);


-- 기존 profiles.room_layout 데이터를 새 방별 테이블로 복사한다.
--
-- 지원 형식:
-- 1. schema_version 2:
--    {
--      "schema_version": 2,
--      "rooms": {
--        "room_lv1": {...},
--        "room_lv2": {...},
--        "room_lv3": {...}
--      }
--    }
--
-- 2. 예전 flat layout:
--    room_lv1 데이터로 이동
--
-- 기존 profiles.room_layout은 삭제하거나 변경하지 않는다.
-- 이미 새 테이블에 같은 방 row가 있으면 기존 row를 보존한다.
DO $migration$
DECLARE
  profile_row record;
  parsed_layout jsonb;
  room_layout jsonb;
  target_room_id text;
  parse_attempt integer;
BEGIN
  FOR profile_row IN
    SELECT
      p.id,
      p.room_layout
    FROM public.profiles AS p
    WHERE p.room_layout IS NOT NULL
  LOOP
    parsed_layout := to_jsonb(profile_row.room_layout);

    -- 문자열 안에 JSON 문자열이 중첩된 경우를 최대 4회까지 해제
    FOR parse_attempt IN 1..4 LOOP
      EXIT WHEN jsonb_typeof(parsed_layout)
        IS DISTINCT FROM 'string';

      BEGIN
        parsed_layout :=
          (parsed_layout #>> '{}')::jsonb;
      EXCEPTION
        WHEN invalid_text_representation THEN
          parsed_layout := NULL;
      END;
    END LOOP;

    -- 정상 JSON object가 아니면 건너뜀
    IF jsonb_typeof(parsed_layout)
      IS DISTINCT FROM 'object' THEN
      CONTINUE;
    END IF;

    -- schema version 2
    IF parsed_layout ->> 'schema_version' = '2'
       AND jsonb_typeof(parsed_layout -> 'rooms') = 'object'
    THEN
      FOREACH target_room_id IN ARRAY ARRAY[
        'room_lv1',
        'room_lv2',
        'room_lv3'
      ]
      LOOP
        room_layout :=
          parsed_layout #> ARRAY['rooms', target_room_id];

        IF jsonb_typeof(room_layout) = 'object' THEN
          INSERT INTO public.studio_room_layouts (
            user_id,
            room_id,
            layout,
            revision
          )
          VALUES (
            profile_row.id,
            target_room_id,
            room_layout,
            1
          )
          ON CONFLICT (user_id, room_id)
          DO NOTHING;
        END IF;
      END LOOP;

    -- 예전 flat layout은 room_lv1로 이동
    ELSE
      INSERT INTO public.studio_room_layouts (
        user_id,
        room_id,
        layout,
        revision
      )
      VALUES (
        profile_row.id,
        'room_lv1',
        parsed_layout,
        1
      )
      ON CONFLICT (user_id, room_id)
      DO NOTHING;
    END IF;
  END LOOP;
END;
$migration$;


-- 현재 방 하나만 원자적으로 저장하는 RPC
CREATE OR REPLACE FUNCTION public.save_studio_room_layout(
  p_room_id text,
  p_layout jsonb,
  p_expected_revision bigint,
  p_inventory jsonb
)
RETURNS TABLE (
  room_id text,
  layout jsonb,
  revision bigint,
  updated_at timestamptz,
  inventory jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $function$
DECLARE
  current_user_id uuid := auth.uid();
  current_revision bigint;
  saved_room public.studio_room_layouts%ROWTYPE;
  saved_inventory jsonb;
BEGIN
  -- 로그인 검사
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION USING
      ERRCODE = '42501',
      MESSAGE = 'STUDIO_ROOM_AUTH_REQUIRED';
  END IF;

  -- 실제 사용하는 방 3개만 허용
  IF p_room_id IS NULL
     OR p_room_id NOT IN (
       'room_lv1',
       'room_lv2',
       'room_lv3'
     )
  THEN
    RAISE EXCEPTION USING
      ERRCODE = '22023',
      MESSAGE = 'STUDIO_ROOM_INVALID_ROOM_ID';
  END IF;

  -- layout은 JSON object만 허용
  IF p_layout IS NULL
     OR jsonb_typeof(p_layout)
       IS DISTINCT FROM 'object'
  THEN
    RAISE EXCEPTION USING
      ERRCODE = '22023',
      MESSAGE = 'STUDIO_ROOM_INVALID_LAYOUT';
  END IF;

  -- 현재 프로젝트의 inventory 저장 형식은 JSON object
  IF p_inventory IS NULL
     OR jsonb_typeof(p_inventory)
       IS DISTINCT FROM 'object'
  THEN
    RAISE EXCEPTION USING
      ERRCODE = '22023',
      MESSAGE = 'STUDIO_ROOM_INVALID_INVENTORY';
  END IF;

  -- 같은 사용자 + 같은 방의 저장만 직렬화한다.
  -- 서로 다른 방은 서로 막지 않는다.
  PERFORM pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(
      current_user_id::text || ':' || p_room_id,
      0
    )
  );

  SELECT room.revision
  INTO current_revision
  FROM public.studio_room_layouts AS room
  WHERE room.user_id = current_user_id
    AND room.room_id = p_room_id
  FOR UPDATE;

  -- 해당 방 row가 아직 없는 경우
  IF NOT FOUND THEN
    IF COALESCE(p_expected_revision, 0) <> 0 THEN
      RAISE EXCEPTION USING
        ERRCODE = '40001',
        MESSAGE = 'STUDIO_ROOM_REVISION_CONFLICT',
        DETAIL = format(
          '{"room_id":%L,"expected_revision":%s,"actual_revision":0}',
          p_room_id,
          p_expected_revision
        );
    END IF;

    INSERT INTO public.studio_room_layouts AS room (
      user_id,
      room_id,
      layout,
      revision
    )
    VALUES (
      current_user_id,
      p_room_id,
      p_layout,
      1
    )
    RETURNING room.*
    INTO saved_room;

  -- 기존 방 row가 있는 경우
  ELSE
    IF p_expected_revision IS NULL
       OR p_expected_revision <> current_revision
    THEN
      RAISE EXCEPTION USING
        ERRCODE = '40001',
        MESSAGE = 'STUDIO_ROOM_REVISION_CONFLICT',
        DETAIL = format(
          '{"room_id":%L,"expected_revision":%s,"actual_revision":%s}',
          p_room_id,
          COALESCE(
            p_expected_revision::text,
            'null'
          ),
          current_revision
        );
    END IF;

    UPDATE public.studio_room_layouts AS room
    SET
      layout = p_layout,
      revision = room.revision + 1
    WHERE room.user_id = current_user_id
      AND room.room_id = p_room_id
    RETURNING room.*
    INTO saved_room;
  END IF;

  -- inventory도 같은 transaction 안에서 저장
  UPDATE public.profiles AS profile
  SET inventory = p_inventory
  WHERE profile.id = current_user_id
  RETURNING to_jsonb(profile.inventory)
  INTO saved_inventory;

  IF NOT FOUND THEN
    RAISE EXCEPTION USING
      ERRCODE = '23503',
      MESSAGE = 'STUDIO_ROOM_PROFILE_NOT_FOUND';
  END IF;

  RETURN QUERY
  SELECT
    saved_room.room_id,
    saved_room.layout,
    saved_room.revision,
    saved_room.updated_at,
    saved_inventory;
END;
$function$;


-- RPC는 로그인한 사용자만 실행 가능
REVOKE ALL
ON FUNCTION public.save_studio_room_layout(
  text,
  jsonb,
  bigint,
  jsonb
)
FROM PUBLIC, anon;


GRANT EXECUTE
ON FUNCTION public.save_studio_room_layout(
  text,
  jsonb,
  bigint,
  jsonb
)
TO authenticated;


-- 복구 원칙:
-- 1. 기존 public.profiles.room_layout은 그대로 남아 있다.
-- 2. 문제가 생기면 새 코드의 쓰기를 중단한다.
-- 3. RPC, 정책, trigger, 새 테이블을 제거할 수 있다.
-- 4. 기존 profiles.room_layout에서 다시 데이터를 복구할 수 있다.