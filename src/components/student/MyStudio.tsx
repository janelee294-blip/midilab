import React, { useEffect, useLayoutEffect, useRef, useState, useCallback } from 'react';
import { Star, Maximize2, Minimize2, ChevronUp, ChevronDown, ChevronLeft, ChevronRight, Music2, VolumeX, Volume2, ShoppingCart, Sparkles, Store, HelpCircle, Hammer, Check, PackageOpen, Edit2, Trash2, DoorOpen } from 'lucide-react';
import type { Profile } from '../../lib/supabase';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

import { STUDIO_ASSETS } from '../../mystudio/studioAssets';

import { StudioShop } from '../../mystudio/StudioShop';
import { StudioGacha } from '../../mystudio/StudioGacha';
import { StudioAuction } from '../../mystudio/StudioAuction';
import { SpecialCombineModal } from '../../mystudio/SpecialCombineModal';
import { TicketUseModal } from '../../mystudio/TicketUseModal';
import { StudioMenu } from '../../mystudio/StudioMenu';
import { ACTIVE_ROOM_IDS } from '../../mystudio/StudioSpaceModal';

// ─── Environment types ─────────────────────────────────────────────────────
export type EnvTime    = 'morning' | 'afternoon' | 'evening' | 'night';
export type EnvWeather = 'sunny' | 'cloudy' | 'rainy';
export type EnvTheme   = 'default' | 'spring' | 'summer' | 'autumn' | 'winter' | 'christmas' | 'halloween';
export type EnvMode    = 'auto' | 'manual';

export interface StudioEnv {
  mode:    EnvMode;
  time:    EnvTime;
  weather: EnvWeather;
  theme:   EnvTheme;
}

const DEFAULT_ENV: StudioEnv = { mode:'auto', time:'night', weather:'sunny', theme:'default' };

function formatDownloadSize(bytes: number): string {
  const safeBytes = Number.isFinite(bytes) && bytes > 0 ? bytes : 0;
  const KB = 1024;
  const MB = KB * 1024;
  const GB = MB * 1024;

  if (safeBytes < KB) return `${Math.round(safeBytes)} B`;
  if (safeBytes < MB) return `${(safeBytes / KB).toLocaleString(undefined, { maximumFractionDigits: 1 })} KB`;
  if (safeBytes < GB) return `${(safeBytes / MB).toLocaleString(undefined, { maximumFractionDigits: 1 })} MB`;
  return `${(safeBytes / GB).toLocaleString(undefined, { maximumFractionDigits: 2 })} GB`;
}

function localTime(): EnvTime {
  const h = new Date().getHours();
  if (h >= 5  && h < 12) return 'morning';
  if (h >= 12 && h < 17) return 'afternoon';
  if (h >= 17 && h < 21) return 'evening';
  return 'night';
}

export const STUDIO_LEVELS = [
  { level: 1, name: '비기너 스튜디오',   description: '작은 방, 큰 꿈의 시작',       pointsRequired: 0,    nextPointsRequired: 500  },
  { level: 2, name: '인디 스튜디오',      description: '따뜻한 조명이 켜졌어요',      pointsRequired: 500,  nextPointsRequired: 1500 },
  { level: 3, name: '크리에이터 스튜디오', description: '악기와 책이 늘어났어요',    pointsRequired: 1500, nextPointsRequired: 3500 },
  { level: 4, name: '프로 스튜디오',      description: '영감이 넘치는 공간',          pointsRequired: 3500, nextPointsRequired: 7000 },
  { level: 5, name: '드림 스튜디오',      description: '당신만의 완벽한 성소',        pointsRequired: 7000, nextPointsRequired: null  },
];

const ROOM_DISPLAY_INFO: Record<string, { level: number; name: string }> = {
  room_lv1: { level: 1, name: '옥탑 작업실' },
  room_lv2: { level: 2, name: '루키 스튜디오' },
  room_lv3: { level: 3, name: '시그니처 스튜디오' },
};

function useStudioEnv(): { env: StudioEnv; loaded: boolean } {
  const [env, setEnv] = useState<StudioEnv>(DEFAULT_ENV);
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    supabase.from('platform_config').select('value').eq('key','studio_env').maybeSingle()
      .then(({ data }) => {
        if (data?.value) {
          try {
            const cfg: StudioEnv = JSON.parse(data.value);
            if (cfg.mode === 'auto') cfg.time = localTime();
            setEnv({ ...DEFAULT_ENV, ...cfg });
          } catch { /* ignore */ }
        }
        setLoaded(true);
      });
  }, []);
  useEffect(() => {
    if (env.mode !== 'auto') return;
    const id = setInterval(() => {
      setEnv(e => {
        const nextTime = localTime();
        return e.time === nextTime ? e : { ...e, time: nextTime };
      });
    }, 60_000);
    return () => clearInterval(id);
  }, [env.mode]);
  return { env, loaded };
}

interface Playlist { id:string; title:string; url:string; season_tag:string; sort_order:number }

function usePlaylists(theme: EnvTheme): Playlist[] {
  const [list, setList] = useState<Playlist[]>([]);
  useEffect(() => {
    supabase.from('studio_playlists').select('*').eq('is_active',true)
      .order('sort_order').then(({ data }) => { setList(data || []); });
  }, []);
  return list.filter(p => p.season_tag === 'all' || p.season_tag === theme);
}

function MusicPlayer({ url, muted, onToggleMute, showHud }: {
  url: string; muted: boolean; onToggleMute: () => void; showHud: boolean;
}) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const fadeInterval = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    
    if (fadeInterval.current) clearInterval(fadeInterval.current);

    if (!muted) {
      if (audio.paused) {
        audio.volume = 0; 
        audio.play().catch(e => console.log('자동재생 대기'));
      }
      fadeInterval.current = setInterval(() => {
        if (audio.volume < 0.45) {
          audio.volume = Math.min(0.5, audio.volume + 0.05);
        } else {
          if (fadeInterval.current) clearInterval(fadeInterval.current);
        }
      }, 100);
    } else {
      fadeInterval.current = setInterval(() => {
        if (audio.volume > 0.1) {
          audio.volume = Math.max(0, audio.volume - 0.1); 
        } else {
          audio.volume = 0;
          audio.pause(); 
          if (fadeInterval.current) clearInterval(fadeInterval.current);
        }
      }, 15); 
    }
  }, [muted, url]); 

  return (
    <>
      <audio ref={audioRef} src={url} loop preload="auto" />
      <div className={`transition-all duration-300 pointer-events-auto ${showHud ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
        <button onClick={onToggleMute}
          className="w-7 h-7 md:w-8 md:h-8 rounded-lg flex items-center justify-center transition-all"
          style={{ background:'rgba(10,6,20,.55)', border:'1px solid rgba(255,255,255,.08)',
                   color: muted ? 'rgba(255,255,255,.6)' : '#f9c76d', backdropFilter:'blur(8px)' }}
          onMouseEnter={e=>(e.currentTarget.style.color='rgba(255,255,255,.95)')}
          onMouseLeave={e=>(e.currentTarget.style.color= muted ? 'rgba(255,255,255,.6)' : '#f9c76d')}
          title={muted ? '음악 켜기' : '음악 끄기'}>
          {muted ? <VolumeX size={14}/> : <Volume2 size={14}/>}
        </button>
      </div>
    </>
  );
}

const deepParse = (data: any): Record<string, number> => {
  if (!data) return {};
  let parsed = data;
  for (let i = 0; i < 4; i++) {
    if (typeof parsed === 'string') {
      try { parsed = JSON.parse(parsed); } catch { break; }
    } else {
      break;
    }
  }
  if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
    return parsed as Record<string, number>;
  }
  return {};
};

// ─── Main export ───────────────────────────────────────────────────────────
type PlainObject = Record<string, unknown>;
const ROOM_IDS = ['room_lv1', 'room_lv2', 'room_lv3', 'room_lv4', 'room_lv5'] as const;
type StudioRoomId = typeof ROOM_IDS[number];
type FlatRoomLayout = PlainObject;

function isActiveRoomId(roomId: unknown): roomId is typeof ACTIVE_ROOM_IDS[number] {
  return typeof roomId === 'string'
    && (ACTIVE_ROOM_IDS as readonly string[]).includes(roomId);
}

interface NormalizedRoomLayout {
  schema_version: 2;
  rooms: Record<StudioRoomId, FlatRoomLayout>;
}

function createEmptyNormalizedRoomLayout(): NormalizedRoomLayout {
  return {
    schema_version: 2,
    rooms: {
      room_lv1: {},
      room_lv2: {},
      room_lv3: {},
      room_lv4: {},
      room_lv5: {},
    },
  };
}

function parseRoomLayout(rawLayout: unknown): unknown {
  let parsed = rawLayout;

  for (let i = 0; i < 4 && typeof parsed === 'string'; i++) {
    try {
      parsed = JSON.parse(parsed);
    } catch {
      return null;
    }
  }

  return parsed;
}

export function normalizeRoomLayout(rawLayout: unknown): NormalizedRoomLayout {
  const parsed = parseRoomLayout(rawLayout);
  const emptyLayout = createEmptyNormalizedRoomLayout();

  if (!isPlainObject(parsed)) return emptyLayout;

  if (parsed.schema_version === 2) {
    if (!isPlainObject(parsed.rooms)) return emptyLayout;

    for (const roomId of ROOM_IDS) {
      const roomLayout = parsed.rooms[roomId];
      emptyLayout.rooms[roomId] = isPlainObject(roomLayout) ? roomLayout : {};
    }

    return emptyLayout;
  }

  emptyLayout.rooms.room_lv1 = parsed;
  return emptyLayout;
}

export function getFlatLayoutForRoom(
  normalizedLayout: NormalizedRoomLayout,
  roomId: string
): FlatRoomLayout {
  return ROOM_IDS.includes(roomId as StudioRoomId)
    ? normalizedLayout.rooms[roomId as StudioRoomId]
    : {};
}

export function setFlatLayoutForRoom(
  normalizedLayout: NormalizedRoomLayout,
  roomId: string,
  flatLayout: unknown
): NormalizedRoomLayout {
  if (!ROOM_IDS.includes(roomId as StudioRoomId)) return normalizedLayout;

  return {
    schema_version: 2,
    rooms: {
      ...normalizedLayout.rooms,
      [roomId]: isPlainObject(flatLayout) ? flatLayout : {},
    },
  };
}

type PreviewRoomId = StudioRoomId;

interface RoomLayoutPreview {
  schema_version: 2;
  source: 'flat' | 'v2';
  rooms: Record<PreviewRoomId, PlainObject>;
}

type RoomLayoutPreviewResult =
  | { ok: true; preview: RoomLayoutPreview }
  | { ok: false; error: string };

export function isPlainObject(value: unknown): value is PlainObject {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

export function getLayoutEntryCount(layout: unknown): number {
  return isPlainObject(layout) ? Object.keys(layout).length : 0;
}

export function normalizeRoomLayoutForPreview(raw: unknown): RoomLayoutPreviewResult {
  let parsed = raw;

  for (let i = 0; i < 4 && typeof parsed === 'string'; i++) {
    try {
      parsed = JSON.parse(parsed);
    } catch (error) {
      return {
        ok: false,
        error: error instanceof Error ? error.message : 'room_layout JSON parsing failed',
      };
    }
  }

  if (!isPlainObject(parsed)) {
    return { ok: false, error: 'room_layout is not a plain object' };
  }

  if (parsed.schema_version === 2) {
    if (!isPlainObject(parsed.rooms)) {
      return { ok: false, error: 'v2 room_layout does not contain a valid rooms object' };
    }

    const rooms = parsed.rooms;
    for (const roomId of ROOM_IDS) {
      if (rooms[roomId] !== undefined && !isPlainObject(rooms[roomId])) {
        return { ok: false, error: `${roomId} is not a plain object` };
      }
    }

    return {
      ok: true,
      preview: {
        schema_version: 2,
        source: 'v2',
        rooms: {
          room_lv1: (rooms.room_lv1 as PlainObject | undefined) || {},
          room_lv2: (rooms.room_lv2 as PlainObject | undefined) || {},
          room_lv3: (rooms.room_lv3 as PlainObject | undefined) || {},
          room_lv4: (rooms.room_lv4 as PlainObject | undefined) || {},
          room_lv5: (rooms.room_lv5 as PlainObject | undefined) || {},
        },
      },
    };
  }

  return {
    ok: true,
    preview: {
      schema_version: 2,
      source: 'flat',
      rooms: {
        room_lv1: parsed,
        room_lv2: {},
        room_lv3: {},
        room_lv4: {},
        room_lv5: {},
      },
    },
  };
}

export function MyStudio({ profile, isActive = true }: { profile: Profile, isActive?: boolean }) {
  const [unlockedRooms, setUnlockedRooms] = useState<string[]>(
    profile.unlocked_rooms?.length ? profile.unlocked_rooms : ['room_lv1']
  );
  const [currentRoomId, setCurrentRoomId] = useState('room_lv1');
  const [defaultRoomId, setDefaultRoomId] = useState('room_lv1');
  const [roomLayoutByRoom, setRoomLayoutByRoom] = useState<NormalizedRoomLayout>(
    createEmptyNormalizedRoomLayout
  );
  const info = ROOM_DISPLAY_INFO[currentRoomId] || ROOM_DISPLAY_INFO.room_lv1;
  const { refreshProfile } = useAuth(); 

  const { env, loaded: envLoaded } = useStudioEnv();
  const playlists = usePlaylists(env.theme);
  const [full, setFull]   = useState(false);
  const [showHud, setShowHud] = useState(true);
  const [muted, setMuted] = useState(false);
  const [trackIdx, setTrackIdx] = useState(0);

  const [isShopOpen, setIsShopOpen] = useState(false); 
  const [isGachaOpen, setIsGachaOpen] = useState(false); 
  const [isTradeOpen, setIsTradeOpen] = useState(false); 
  const [isHelpOpen, setIsHelpOpen] = useState(false); 
  const [isStudioMenuOpen, setIsStudioMenuOpen] = useState(false);

  const [isEditMode, setIsEditMode] = useState(false);
  const [isInvOpen, setIsInvOpen] = useState(true); 
  
  const [inventory, setInventory] = useState<{ [key: string]: number }>({});
  const [ticketNotification, setTicketNotification] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isGodotLoaded, setIsGodotLoaded] = useState(false);
  const [godotLoadProgress, setGodotLoadProgress] = useState({ percent: 0, current: 0, total: 0 });
  const [initialRoomSyncDone, setInitialRoomSyncDone] = useState(false);
  const [isVisiting, setIsVisiting] = useState(false);
  const [todayVisitCount, setTodayVisitCount] = useState(0);
  const [totalVisitCount, setTotalVisitCount] = useState(0);

  const [inventoryPage, setInventoryPage] = useState(0);
  const [hoveredInventoryDescription, setHoveredInventoryDescription] = useState<{
    description: string;
    left: number;
    top: number;
    placement: 'above' | 'below';
    cardCenterX: number;
    tailLeft: number;
  } | null>(null);
  const desktopInventoryTooltipRef = useRef<HTMLDivElement>(null);
  const [mobileInventoryDescription, setMobileInventoryDescription] = useState<{
    name: string;
    description: string;
    left: number;
    top: number;
    placement: 'above' | 'below';
  } | null>(null);
  const [mobileInventoryDescriptionVisible, setMobileInventoryDescriptionVisible] = useState(false);
  const mobileLongPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mobileInventoryDescriptionCloseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mobileInventoryDescriptionEnterFrameRef = useRef<number | null>(null);
  const mobileLongPressStartRef = useRef<{ x: number; y: number } | null>(null);
  const mobileLongPressTriggeredRef = useRef(false);
  const mobileLongPressMovedRef = useRef(false);
  const [miniMobileInventoryDescription, setMiniMobileInventoryDescription] = useState<{
    name: string;
    description: string;
    left: number;
    top: number;
    placement: 'above' | 'below';
    cardCenterX: number;
    tailLeft: number;
  } | null>(null);
  const [miniMobileInventoryDescriptionVisible, setMiniMobileInventoryDescriptionVisible] = useState(false);
  const miniMobileInventoryTooltipRef = useRef<HTMLDivElement>(null);
  const miniMobileLongPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const miniMobileInventoryDescriptionCloseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const miniMobileInventoryDescriptionEnterFrameRef = useRef<number | null>(null);
  const miniMobileLongPressStartRef = useRef<{ x: number; y: number } | null>(null);
  const miniMobileLongPressTriggeredRef = useRef(false);
  const miniMobileLongPressMovedRef = useRef(false);
  const [trackConfig, setTrackConfig] = useState({ width: 0, visibleSlots: 8, itemW: 120, gapW: 16 });
  const [isMobile, setIsMobile] = useState(false);
  const trackWrapperRef = useRef<HTMLDivElement>(null);
  const lastSentEnvKeyRef = useRef<string | null>(null);

  const godotFrameRef = useRef<HTMLIFrameElement>(null);
  const containerRef = useRef<HTMLDivElement>(null); 
  const hasSentInitialRoomSwitch = useRef(false);

  const [isEditingName, setIsEditingName] = useState(false);
  const [studioName, setStudioName] = useState('');
  
  // 🚨 휴지통 모드 및 삭제 타겟 상태만 유지 (구버전 actionModal 완전 삭제)
  const [isTrashMode, setIsTrashMode] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [deleteQuantity, setDeleteQuantity] = useState(1);


// 🚨 스페셜 아이템 모달 상태
  const [selectedSpecial, setSelectedSpecial] = useState<any>(null);
  const [selectedTicket, setSelectedTicket] = useState<typeof STUDIO_ASSETS[0] | null>(null);

  const [activePassives, setActivePassives] = useState<Record<string, boolean>>(() => {
  const saved = localStorage.getItem("active_passives");
  return saved ? JSON.parse(saved) : {};
});

useEffect(() => {
  localStorage.setItem(
    "active_passives",
    JSON.stringify(activePassives)
  );
}, [activePassives]);

  useLayoutEffect(() => {
    const tooltip = desktopInventoryTooltipRef.current;
    if (!tooltip || !hoveredInventoryDescription) return;

    const tooltipWidth = tooltip.offsetWidth;
    const halfTooltipWidth = tooltipWidth / 2;
    const viewportPadding = 8;
    const tooltipLeft = Math.min(
      window.innerWidth - halfTooltipWidth - viewportPadding,
      Math.max(halfTooltipWidth + viewportPadding, hoveredInventoryDescription.cardCenterX)
    );
    const tooltipActualLeft = tooltipLeft - halfTooltipWidth;
    const tailPadding = 12;
    const tailLeft = Math.min(
      tooltipWidth - tailPadding,
      Math.max(tailPadding, hoveredInventoryDescription.cardCenterX - tooltipActualLeft)
    );

    setHoveredInventoryDescription(current => {
      if (!current || (current.left === tooltipLeft && current.tailLeft === tailLeft)) return current;
      return { ...current, left: tooltipLeft, tailLeft };
    });
  }, [hoveredInventoryDescription?.cardCenterX, hoveredInventoryDescription?.description]);

  useLayoutEffect(() => {
    const tooltip = miniMobileInventoryTooltipRef.current;
    if (!tooltip || !miniMobileInventoryDescription) return;

    const tooltipWidth = tooltip.offsetWidth;
    const tooltipActualLeft = miniMobileInventoryDescription.left - tooltipWidth / 2;
    const tailLeft = Math.min(
      tooltipWidth - 12,
      Math.max(12, miniMobileInventoryDescription.cardCenterX - tooltipActualLeft)
    );

    setMiniMobileInventoryDescription(current => {
      if (!current || current.tailLeft === tailLeft) return current;
      return { ...current, tailLeft };
    });
  }, [miniMobileInventoryDescription?.cardCenterX, miniMobileInventoryDescription?.description]);

  // 🚨 이름 수정 및 DB 저장 (완벽한 낙관적 업데이트)
  const handleNameSave = async () => {
    if (!isEditingName) return; 
    
    const trimmedName = studioName.trim();
    if (!trimmedName) {
      setIsEditingName(false);
      return;
    }
    
    try {
      // 1. 화면 즉시 반영 (딜레이 없음)
      setStudioName(trimmedName);
      setIsEditingName(false);
      
      // 2. DB 업데이트
      const { error } = await supabase.from('profiles').update({ studio_name: trimmedName }).eq('id', profile.id);
      if (error) throw error;
      
      // 3. 최신 상태 DB에서 다시 한번 완벽히 동기화
      loadStudioData(); 
    } catch (err) {
      console.error("이름 변경 실패", err);
    }
  };

  const sendToGodot = useCallback((type: string, data?: any) => {
    if (godotFrameRef.current && godotFrameRef.current.contentWindow) {
      godotFrameRef.current.contentWindow.postMessage({ type, data }, '*');
    }
  }, []);

  const handleSelectRoom = useCallback((roomId: string) => {
    if (!isActiveRoomId(roomId)) return;

    if (isEditMode) {
      window.alert('가구 수정 모드를 종료하고 저장한 뒤 이동해주세요.');
      return;
    }

    setCurrentRoomId(roomId);
    sendToGodot('SWITCH_ROOM', { room_id: roomId });
    sendToGodot('LOAD_LAYOUT', {
      room_layout: getFlatLayoutForRoom(roomLayoutByRoom, roomId),
      is_readonly: false,
    });
  }, [isEditMode, roomLayoutByRoom, sendToGodot]);

  const handleSetDefaultRoom = useCallback(async (roomId: string) => {
    if (
      !isActiveRoomId(roomId)
      || (roomId !== 'room_lv1' && !unlockedRooms.includes(roomId))
    ) return;

    const { error } = await supabase
      .from('profiles')
      .update({ default_room_id: roomId })
      .eq('id', profile.id);

    if (error) {
      console.error('대표방 지정 실패:', error);
      return;
    }

    setDefaultRoomId(roomId);
  }, [profile.id, unlockedRooms]);

  const loadStudioData = useCallback(async (shouldSendInitialRoomSwitch = false) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('inventory, room_layout, studio_name, unlocked_rooms, default_room_id')
      .eq('id', profile.id)
      .single();

    if (error) return;

    if (data) {
      const safeInv = deepParse(data.inventory);
      const normalizedLayout = normalizeRoomLayout(data.room_layout);
      const safeUnlockedRooms = Array.isArray(data.unlocked_rooms) && data.unlocked_rooms.length > 0
        ? data.unlocked_rooms
        : ['room_lv1'];
      const safeDefaultRoomId =
        isActiveRoomId(data.default_room_id)
        && (data.default_room_id === 'room_lv1' || safeUnlockedRooms.includes(data.default_room_id))
          ? data.default_room_id
          : 'room_lv1';

      if (data.default_room_id !== safeDefaultRoomId) {
        supabase
          .from('profiles')
          .update({ default_room_id: safeDefaultRoomId })
          .eq('id', profile.id)
          .then(({ error: correctionError }) => {
            if (correctionError) {
              console.error('대표방 기본값 보정 실패:', correctionError);
            }
          });
      }
      
      setInventory(safeInv);
      setUnlockedRooms(safeUnlockedRooms);
      setRoomLayoutByRoom(normalizedLayout);
      setCurrentRoomId(safeDefaultRoomId);
      setDefaultRoomId(safeDefaultRoomId);
      setStudioName(data.studio_name || `${profile.full_name}의 스튜디오`);
      
      sendToGodot('INITIALIZE_STUDIO_DATA', { 
        inventory: JSON.stringify(safeInv), 
        room_layout: JSON.stringify(getFlatLayoutForRoom(normalizedLayout, safeDefaultRoomId))
      });

      if (
        shouldSendInitialRoomSwitch
        && safeDefaultRoomId !== 'room_lv1'
        && !hasSentInitialRoomSwitch.current
      ) {
        hasSentInitialRoomSwitch.current = true;
        sendToGodot('SWITCH_ROOM', { room_id: safeDefaultRoomId });
      }

      if (shouldSendInitialRoomSwitch) {
        requestAnimationFrame(() => {
          requestAnimationFrame(() => setInitialRoomSyncDone(true));
        });
      }
    }
  }, [profile.id, profile.full_name, sendToGodot]);

  const loadVisitCounts = useCallback(async () => {
    const now = new Date();
    const today = [
      now.getFullYear(),
      String(now.getMonth() + 1).padStart(2, '0'),
      String(now.getDate()).padStart(2, '0')
    ].join('-');

    try {
      const [todayResult, totalResult] = await Promise.all([
        supabase
          .from('studio_visits')
          .select('id', { count: 'exact', head: true })
          .eq('studio_owner_id', profile.id)
          .eq('visited_date', today),
        supabase
          .from('studio_visits')
          .select('id', { count: 'exact', head: true })
          .eq('studio_owner_id', profile.id)
      ]);

      if (todayResult.error) {
        console.warn('오늘 방문자 수 조회 실패:', todayResult.error);
      } else {
        setTodayVisitCount(todayResult.count ?? 0);
      }

      if (totalResult.error) {
        console.warn('누적 방문자 수 조회 실패:', totalResult.error);
      } else {
        setTotalVisitCount(totalResult.count ?? 0);
      }
    } catch (error) {
      console.warn('방문자 수 조회 실패:', error);
    }
  }, [profile.id]);

  useEffect(() => {
    loadVisitCounts();
  }, [loadVisitCounts]);

  const handleReturnHome = useCallback(async () => {
    const targetRoomId = isActiveRoomId(defaultRoomId)
      && (defaultRoomId === 'room_lv1' || unlockedRooms.includes(defaultRoomId))
      ? defaultRoomId
      : 'room_lv1';

    setIsVisiting(false);
    setCurrentRoomId(targetRoomId);
    sendToGodot('SWITCH_ROOM', { room_id: targetRoomId });
    sendToGodot('LOAD_LAYOUT', {
      room_layout: getFlatLayoutForRoom(roomLayoutByRoom, targetRoomId),
      is_readonly: false,
    });
    await loadStudioData();
    await loadVisitCounts();
  }, [
    defaultRoomId,
    loadStudioData,
    loadVisitCounts,
    roomLayoutByRoom,
    sendToGodot,
    unlockedRooms,
  ]);

  const handleStudioMenuMessage = useCallback(async (type: string, data?: any) => {
    if (type === 'VISIT_STUDIO') {
      const studentId = data?.studentId;
      if (!studentId) return;

      const { data: profileData, error } = await supabase
        .from('profiles')
        .select('room_layout, default_room_id, unlocked_rooms')
        .eq('id', studentId)
        .single();

      if (error || !profileData) {
        console.error('방문 스튜디오 로드 실패:', error);
        return;
      }

      if (studentId !== profile.id) {
        const { error: visitError } = await supabase
          .from('studio_visits')
          .insert({
            studio_owner_id: studentId,
            visitor_id: profile.id
          });

        if (visitError && visitError.code !== '23505') {
          console.warn('스튜디오 방문 기록 저장 실패:', visitError);
        }
      }

      const targetLayoutByRoom = normalizeRoomLayout(profileData.room_layout);

      const targetRoomId =
        isActiveRoomId(profileData.default_room_id)
        && Array.isArray(profileData.unlocked_rooms)
        && (
          profileData.default_room_id === 'room_lv1'
          || profileData.unlocked_rooms.includes(profileData.default_room_id)
        )
          ? profileData.default_room_id
          : 'room_lv1';

      setIsEditMode(false);
      setIsTrashMode(false);
      setIsVisiting(true);
      setCurrentRoomId(targetRoomId);

      sendToGodot('SWITCH_ROOM', { room_id: targetRoomId });
      sendToGodot('LOAD_LAYOUT', {
        room_layout: getFlatLayoutForRoom(targetLayoutByRoom, targetRoomId),
        is_readonly: true
      });

      return;
    }

    sendToGodot(type, data);
  }, [profile.id, sendToGodot]);

  const handleIframeLoad = () => {
    setIsGodotLoaded(false);
    setGodotLoadProgress({ percent: 0, current: 0, total: 0 });
    lastSentEnvKeyRef.current = null;
  };

  useEffect(() => {
    const handleGodotMessage = async (event: MessageEvent) => {
      if (event.source !== godotFrameRef.current?.contentWindow) return;
      if (event.origin !== window.location.origin) return;
      if (!event.data || !event.data.type) return;
      
      switch (event.data.type) {
        case 'LOAD_PROGRESS':
          if (event.data.source !== 'godot') break;
          setGodotLoadProgress({
            percent: Number(event.data.percent) || 0,
            current: Number(event.data.current) || 0,
            total: Number(event.data.total) || 0,
          });
          break;
        case 'LOAD_COMPLETE':
          if (event.data.source !== 'godot') break;
          setGodotLoadProgress(current => ({ ...current, percent: 100 }));
          break;
        case 'GODOT_READY':
          loadStudioData(true);
          break;
        case 'OPEN_SHOP': setIsShopOpen(true); break;
        case 'OPEN_GACHA': setIsGachaOpen(true); break;
        case 'OPEN_TRADE': setIsTradeOpen(true); break;
        case 'UPDATE_INVENTORY':
          if (event.data.inventory_data) {
            const incomingInv = deepParse(event.data.inventory_data);
            if (Object.keys(incomingInv).length > 0) {
              setInventory(incomingInv);
            }
          }
          break;
        case 'SAVE_STUDIO_CONFIRM': {
          if (isVisiting) break;

          if (event.data.inventory && event.data.room_layout) {
            let parsedRoomLayout: unknown;
            try {
              parsedRoomLayout = typeof event.data.room_layout === 'string'
                ? JSON.parse(event.data.room_layout)
                : event.data.room_layout;
            } catch (parseError) {
              console.warn('[MyStudio] SAVE_STUDIO_CONFIRM room_layout parsing failed. DB update skipped.', parseError);
              break;
            }

            if (!isPlainObject(parsedRoomLayout)) {
              console.warn('[MyStudio] SAVE_STUDIO_CONFIRM room_layout is not a flat object. DB update skipped.');
              break;
            }

            const parsedInventory = deepParse(event.data.inventory);
            const previewResult = normalizeRoomLayoutForPreview(parsedRoomLayout);
            const updatedNormalizedLayout = setFlatLayoutForRoom(
              roomLayoutByRoom,
              currentRoomId,
              parsedRoomLayout
            );
            const roomLayoutPayloadType = Array.isArray(event.data.room_layout)
              ? 'array'
              : typeof event.data.room_layout;

            console.log('[MyStudio] SAVE_STUDIO_CONFIRM validation', {
              roomLayoutPayloadType,
              layoutEntryCount: getLayoutEntryCount(parsedRoomLayout),
              inventoryKeyCount: Object.keys(parsedInventory).length,
              previewFormat: previewResult.ok ? previewResult.preview.source : 'invalid',
            });

            if (!previewResult.ok) {
              console.warn('[MyStudio] room_layout preview validation failed.', previewResult.error);
            }

            setIsSaving(true);
            try {
              const { error } = await supabase
                .from('profiles')
                .update({
                  inventory: parsedInventory,
                  room_layout: updatedNormalizedLayout
                })
                .eq('id', profile.id);

              if (error) {
                console.warn('[MyStudio] SAVE_STUDIO_CONFIRM Supabase update failed.', error);
              } else {
                setRoomLayoutByRoom(updatedNormalizedLayout);
                console.log('[MyStudio] SAVE_STUDIO_CONFIRM Supabase update succeeded.', {
                  success: true,
                  roomId: currentRoomId,
                });
              }
            } catch (updateError) {
              console.warn('[MyStudio] SAVE_STUDIO_CONFIRM Supabase update threw an error.', updateError);
            } finally {
              setIsSaving(false);
            }
          }
          break;
        }
      }
    };
    
    window.addEventListener('message', handleGodotMessage);
    (window as any).onGodotReady = () => {
      setIsGodotLoaded(true);
      loadStudioData(true);
    };

    return () => {
      window.removeEventListener('message', handleGodotMessage);
      delete (window as any).onGodotReady;
    };
  }, [currentRoomId, isVisiting, loadStudioData, profile.id, roomLayoutByRoom]);

  const sendEnvUpdate = useCallback((nextEnv: StudioEnv) => {
    const envKey = JSON.stringify({
      mode: nextEnv.mode,
      time: nextEnv.time,
      weather: nextEnv.weather,
      theme: nextEnv.theme,
    });
    if (lastSentEnvKeyRef.current === envKey) return;

    lastSentEnvKeyRef.current = envKey;
    sendToGodot('env_update', nextEnv);
  }, [sendToGodot]);

  useEffect(() => {
    if (!isGodotLoaded || !envLoaded) return;
    sendEnvUpdate(env);
  }, [env, envLoaded, isGodotLoaded, sendEnvUpdate]);

  useEffect(() => { setMuted(!isActive); }, [isActive]);
  useEffect(() => { setTrackIdx(0); }, [playlists.length]);

  const toggleFullscreen = async () => {
    if (!document.fullscreenElement) {
      if (containerRef.current?.requestFullscreen) await containerRef.current.requestFullscreen();
    } else {
      if (document.exitFullscreen) await document.exitFullscreen();
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => setFull(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const toggleEditMode = () => {
    const nextMode = !isEditMode;
    setIsEditMode(nextMode);
    
    if (nextMode) setIsInvOpen(true); 
    sendToGodot('TOGGLE_EDIT_MODE', { is_edit_mode: nextMode });
    if (!nextMode) {
      sendToGodot('SAVE_ROOM');
      setIsTrashMode(false); // 수정 모드 종료 시 휴지통 모드 자동 해제
    }
  };

  // 🚨 자체 삭제 실행 함수 (배치된 아이템 보호 로직 포함)
  // 🚨 정석적 구조가 적용된 삭제 트리거 (딕셔너리 구조에 맞춘 배치 수량 연산)
  const handleDiscard = async (itemId: string, quantity: number) => {
    // 1. 프로필의 룸 레이아웃 데이터(딕셔너리)에서 배치된 개수 추출
    const placedCount = ROOM_IDS.reduce((count, roomId) => {
      const roomLayout = roomLayoutByRoom.rooms[roomId];
      return count + Object.keys(roomLayout).filter(key => key.split('_')[0] === itemId).length;
    }, 0);

    // 2. 총 보유량 및 삭제 가능 수량 산출
    const totalCount = inventory[itemId] || 0;
    const maxDiscardable = totalCount - placedCount;

    // 3. 배치된 아이템을 삭제하려는 시도 물리적 차단
    if (quantity > maxDiscardable) {
      alert(`❌ 방에 배치된 아이템은 삭제할 수 없습니다.\n(보유: ${totalCount}개 / 배치: ${placedCount}개 / 삭제 가능: ${maxDiscardable}개)`);
      setDeleteTarget(null);
      setDeleteQuantity(1);
      return;
    }

    try {
      const newInv = { ...inventory };
      
      // 4. 수량 차감
      if (totalCount <= quantity) {
        delete newInv[itemId];
      } else {
        newInv[itemId] = totalCount - quantity;
      }
      
      // 5. DB 업데이트
      const { error } = await supabase
        .from('profiles')
        .update({ inventory: newInv })
        .eq('id', profile.id);

      if (error) throw error;
      
      // 6. 리액트 상태 즉시 반영 및 고도 엔진에 델타 패치 전송
      setInventory(newInv);
      sendToGodot('UPDATE_INVENTORY', { inventory_data: JSON.stringify(newInv) });

    } catch (err) {
      console.error("삭제 실패:", err);
      alert("삭제 실패");
    } finally {
      setDeleteTarget(null);
      setDeleteQuantity(1);
    }
  };

  // 🚨 아이템 클릭 시 역학 (휴지통 켜져있으면 삭제 모달 호출, 꺼져있으면 즉시 배치)
  const handleItemClick = (itemName: string) => {
    if (!isEditMode) return;
    
    if (isTrashMode) {
      setDeleteTarget(itemName); // 휴지통 모드 ON: 자체 삭제 모달 띄우기
      setDeleteQuantity(1); // 모달 호출 시 개수 초기화
    } else {
      sendToGodot('SPAWN_FURNITURE', { item_name: itemName }); // 휴지통 모드 OFF: 즉시 방에 배치
    }
  };

  useEffect(() => {
    const calculateTrack = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      
      const itemW = mobile ? 80 : 120;
      const gapW = mobile ? 12 : 16;
      
      let availableWidth = trackWrapperRef.current ? trackWrapperRef.current.clientWidth : 0;
      if (availableWidth < 100) {
        const paddingAndButtonsOffset = mobile ? 96 : 160; 
        availableWidth = window.innerWidth - paddingAndButtonsOffset;
      }
      
      const slots = Math.max(1, Math.floor((availableWidth + gapW) / (itemW + gapW)));
      const exactWidth = slots * (itemW + gapW) - gapW;
      
      setTrackConfig({ width: exactWidth, visibleSlots: slots, itemW, gapW });
    };

    calculateTrack();
    window.addEventListener('resize', calculateTrack);
    const timeoutId = setTimeout(calculateTrack, 100);
    return () => {
      window.removeEventListener('resize', calculateTrack);
      clearTimeout(timeoutId);
    };
  }, []);

  const MAX_PAGE = 1; 
  const TOTAL_SLOTS = trackConfig.visibleSlots * 2; 

  const handlePrevPage = () => setInventoryPage((p) => Math.max(0, p - 1));
  const handleNextPage = () => setInventoryPage((p) => Math.min(MAX_PAGE, p + 1));

  const closeMobileInventoryDescription = useCallback(() => {
    if (mobileInventoryDescriptionEnterFrameRef.current !== null) {
      cancelAnimationFrame(mobileInventoryDescriptionEnterFrameRef.current);
      mobileInventoryDescriptionEnterFrameRef.current = null;
    }
    setMobileInventoryDescriptionVisible(false);
    if (mobileInventoryDescriptionCloseTimerRef.current) {
      clearTimeout(mobileInventoryDescriptionCloseTimerRef.current);
    }
    mobileInventoryDescriptionCloseTimerRef.current = setTimeout(() => {
      setMobileInventoryDescription(null);
      mobileInventoryDescriptionCloseTimerRef.current = null;
    }, 150);
  }, []);

  const closeMiniMobileInventoryDescription = useCallback(() => {
    if (miniMobileInventoryDescriptionEnterFrameRef.current !== null) {
      cancelAnimationFrame(miniMobileInventoryDescriptionEnterFrameRef.current);
      miniMobileInventoryDescriptionEnterFrameRef.current = null;
    }
    setMiniMobileInventoryDescriptionVisible(false);
    if (miniMobileInventoryDescriptionCloseTimerRef.current) {
      clearTimeout(miniMobileInventoryDescriptionCloseTimerRef.current);
    }
    miniMobileInventoryDescriptionCloseTimerRef.current = setTimeout(() => {
      setMiniMobileInventoryDescription(null);
      miniMobileInventoryDescriptionCloseTimerRef.current = null;
    }, 150);
  }, []);

  useEffect(() => {
    setHoveredInventoryDescription(null);
  }, [inventoryPage]);

  useEffect(() => {
    const hideInventoryDescription = () => setHoveredInventoryDescription(null);
    window.addEventListener('scroll', hideInventoryDescription, true);
    return () => window.removeEventListener('scroll', hideInventoryDescription, true);
  }, []);

  useEffect(() => {
    setMobileInventoryDescriptionVisible(false);
    setMobileInventoryDescription(null);
  }, [inventoryPage]);

  useEffect(() => {
    const hideMobileInventoryDescription = () => {
      if (window.innerWidth < 768) closeMobileInventoryDescription();
    };

    document.addEventListener('pointerdown', hideMobileInventoryDescription);
    window.addEventListener('scroll', hideMobileInventoryDescription, true);
    return () => {
      document.removeEventListener('pointerdown', hideMobileInventoryDescription);
      window.removeEventListener('scroll', hideMobileInventoryDescription, true);
      if (mobileLongPressTimerRef.current) clearTimeout(mobileLongPressTimerRef.current);
      if (mobileInventoryDescriptionCloseTimerRef.current) clearTimeout(mobileInventoryDescriptionCloseTimerRef.current);
      if (mobileInventoryDescriptionEnterFrameRef.current !== null) cancelAnimationFrame(mobileInventoryDescriptionEnterFrameRef.current);
    };
  }, [closeMobileInventoryDescription]);

  useEffect(() => {
    const hideMiniMobileInventoryDescription = () => {
      if (window.innerWidth < 768) closeMiniMobileInventoryDescription();
    };

    document.addEventListener('pointerdown', hideMiniMobileInventoryDescription);
    window.addEventListener('scroll', hideMiniMobileInventoryDescription, true);
    return () => {
      document.removeEventListener('pointerdown', hideMiniMobileInventoryDescription);
      window.removeEventListener('scroll', hideMiniMobileInventoryDescription, true);
      if (miniMobileLongPressTimerRef.current) clearTimeout(miniMobileLongPressTimerRef.current);
      if (miniMobileInventoryDescriptionCloseTimerRef.current) clearTimeout(miniMobileInventoryDescriptionCloseTimerRef.current);
      if (miniMobileInventoryDescriptionEnterFrameRef.current !== null) cancelAnimationFrame(miniMobileInventoryDescriptionEnterFrameRef.current);
    };
  }, [closeMiniMobileInventoryDescription]);

  const showTicketNotification = (message: string) => {
    setTicketNotification(message);
    setTimeout(() => setTicketNotification(null), 3000);
  };

  const containerStyle: React.CSSProperties = full
    ? { width: '100%', height: '100%', margin: 0, padding: 0, maxWidth: 'none' }
    : { width: '100%', height:'calc(100vh - 102px)', minHeight:400 };

  return (
    <div ref={containerRef} className="relative w-full overflow-hidden select-none bg-[#060b18]" style={containerStyle}>
      {ticketNotification && (
        <div className="absolute top-10 left-1/2 -translate-x-1/2 z-[120] bg-[#22d3ee]/20 border border-[#22d3ee]/50 text-white px-4 py-2 md:px-6 md:py-3 text-sm md:text-base rounded-full backdrop-blur-md shadow-2xl whitespace-nowrap pointer-events-none">
          {ticketNotification}
        </div>
      )}

      {hoveredInventoryDescription && (
        <div
          ref={desktopInventoryTooltipRef}
          className="fixed z-[200] hidden w-max max-w-xs rounded-xl border border-white/10 bg-[#060b18]/95 px-3 py-2 text-center text-white shadow-2xl pointer-events-none md:block"
          style={{
            left: hoveredInventoryDescription.left,
            top: hoveredInventoryDescription.top,
            animation: 'inventory-tooltip-fade-in 150ms ease-out both',
            transform: hoveredInventoryDescription.placement === 'above'
              ? 'translate(-50%, -100%)'
              : 'translate(-50%, 0)',
          }}
        >
          <span className="line-clamp-3 whitespace-pre-line text-[8px] md:text-[9px] leading-tight text-white/70 font-medium">
            {hoveredInventoryDescription.description}
          </span>
          <div
            className={`absolute -translate-x-1/2 w-2 h-2 bg-[#060b18]/95 rotate-45 ${
              hoveredInventoryDescription.placement === 'above'
                ? '-bottom-1 border-b border-r border-white/10'
                : '-top-1 border-t border-l border-white/10'
            }`}
            style={{ left: hoveredInventoryDescription.tailLeft }}
          />
        </div>
      )}

      {mobileInventoryDescription && (
        <div
          className="fixed z-[200] w-max rounded-xl border border-white/10 bg-[#060b18]/95 px-3 py-2 text-center text-white shadow-2xl pointer-events-none md:hidden"
          style={{
            left: mobileInventoryDescription.left,
            top: mobileInventoryDescription.top,
            maxWidth: 'min(15rem, calc(100vw - 1rem))',
            opacity: mobileInventoryDescriptionVisible ? 1 : 0,
            translate: mobileInventoryDescriptionVisible ? '0 0' : '0 2px',
            scale: mobileInventoryDescriptionVisible ? '1' : '0.98',
            transition: 'opacity 150ms ease, translate 150ms ease, scale 150ms ease',
            transform: mobileInventoryDescription.placement === 'above'
              ? 'translate(-50%, -100%)'
              : 'translate(-50%, 0)',
          }}
        >
          <div className="flex flex-col items-center gap-1">
            <span className="text-[10px] font-black text-[#f9c76d]">
              {mobileInventoryDescription.name}
            </span>
            <span className="line-clamp-3 whitespace-pre-line text-[9px] leading-tight text-white/70 font-medium">
              {mobileInventoryDescription.description}
            </span>
          </div>
          <div className={`absolute left-1/2 -translate-x-1/2 w-2 h-2 bg-[#060b18]/95 rotate-45 ${
            mobileInventoryDescription.placement === 'above'
              ? '-bottom-1 border-b border-r border-white/10'
              : '-top-1 border-t border-l border-white/10'
          }`} />
        </div>
      )}

      {miniMobileInventoryDescription && (
        <div
          ref={miniMobileInventoryTooltipRef}
          className="fixed z-[200] w-max rounded-xl border border-white/10 bg-[#060b18]/95 px-3 py-2 text-center text-white shadow-2xl pointer-events-none md:hidden"
          style={{
            left: miniMobileInventoryDescription.left,
            top: miniMobileInventoryDescription.top,
            maxWidth: 'min(15rem, calc(100vw - 1rem))',
            opacity: miniMobileInventoryDescriptionVisible ? 1 : 0,
            translate: miniMobileInventoryDescriptionVisible ? '0 0' : '0 2px',
            scale: miniMobileInventoryDescriptionVisible ? '1' : '0.98',
            transition: 'opacity 150ms ease, translate 150ms ease, scale 150ms ease',
            transform: miniMobileInventoryDescription.placement === 'above'
              ? 'translate(-50%, -100%)'
              : 'translate(-50%, 0)',
          }}
        >
          <div className="flex flex-col items-center gap-1">
            <span className="text-[10px] font-black text-[#f9c76d]">
              {miniMobileInventoryDescription.name}
            </span>
            <span className="line-clamp-3 whitespace-pre-line text-[9px] leading-tight text-white/70 font-medium">
              {miniMobileInventoryDescription.description}
            </span>
          </div>
          <div
            className={`absolute -translate-x-1/2 w-2 h-2 bg-[#060b18]/95 rotate-45 ${
              miniMobileInventoryDescription.placement === 'above'
                ? '-bottom-1 border-b border-r border-white/10'
                : '-top-1 border-t border-l border-white/10'
            }`}
            style={{ left: miniMobileInventoryDescription.tailLeft }}
          />
        </div>
      )}
      
      <style>{`
        @keyframes inventory-tooltip-fade-in {
          from { opacity: 0; translate: 0 2px; scale: 0.98; }
          to { opacity: 1; translate: 0 0; scale: 1; }
        }
        @keyframes marquee-scroll {
          0% { transform: translateX(250px); }
          100% { transform: translateX(-100%); }
        }
        .animate-marquee-scroll {
          display: inline-block;
          white-space: nowrap;
          animation: marquee-scroll 10s linear infinite;
        }
        .marquee-mask {
          mask-image: linear-gradient(to right, transparent, black 15%, black 85%, transparent);
          -webkit-mask-image: linear-gradient(to right, transparent, black 15%, black 85%, transparent);
        }
        /* 🚨 버튼 아이콘 전용 무한 반복 모션 추가 */
        @keyframes hover-shake-x {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-2.5px); }
          75% { transform: translateX(2.5px); }
        }
        @keyframes hover-wiggle {
          0%, 100% { transform: rotate(-15deg); }
          50% { transform: rotate(15deg); }
        }
        @keyframes hover-bounce-small {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-4px); }
        }
        .group:hover .group-hover\\:animate-shake-x { animation: hover-shake-x 0.5s ease-in-out infinite; }
        .group:hover .group-hover\\:animate-wiggle { animation: hover-wiggle 0.5s ease-in-out infinite; }
        .group:hover .group-hover\\:animate-bounce-small { animation: hover-bounce-small 0.5s ease-in-out infinite; }
      `}</style>

      <iframe
        ref={godotFrameRef}
        src="/mystudio/index.html"
        title="3D Room Viewer"
        onLoad={handleIframeLoad}
        allow="autoplay; cross-origin-isolated"
        style={{
          width: '100%',
          height: '100%',
          position: 'absolute',
          inset: 0,
          border: 'none',
          pointerEvents: initialRoomSyncDone ? 'auto' : 'none',
          opacity: initialRoomSyncDone ? 1 : 0,
          transition: 'opacity 150ms ease-out',
        }}
      />

      {!initialRoomSyncDone && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-[#060b18]/90 px-4 backdrop-blur-md pointer-events-auto">
          <div className="flex max-w-sm flex-col items-center rounded-xl border border-white/10 bg-[#0b101e]/90 px-7 py-6 text-center shadow-[0_18px_60px_rgba(0,0,0,0.55)]">
            <div
              className="mb-4 h-7 w-7 animate-spin rounded-full border-2 border-white/15 border-t-[#22d3ee]"
              role="status"
              aria-label="스튜디오 로딩 중"
            />
            <p className="text-sm font-bold text-white md:text-base">
              스튜디오 불러오는 중...
            </p>
            <p className="mt-2 text-xs text-white/50">
              작업실과 가구 배치를 준비하고 있어요
            </p>
            <div className="mt-4 w-full">
              <p className="text-sm font-black tabular-nums text-[#22d3ee]">
                {godotLoadProgress.percent}%
              </p>
              <div
                className="mt-2 h-2 w-full overflow-hidden rounded-full bg-white/10"
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={godotLoadProgress.percent}
              >
                <div
                  className="h-full rounded-full bg-gradient-to-r from-[#22d3ee] to-[#3b82f6] transition-[width] duration-200 ease-out"
                  style={{ width: `${godotLoadProgress.percent}%` }}
                />
              </div>
              {godotLoadProgress.total > 0 && (
                <p className="mt-2 text-[11px] tabular-nums text-white/50">
                  {formatDownloadSize(godotLoadProgress.current)} / {formatDownloadSize(godotLoadProgress.total)}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

{/* 🚨 가구 제어 모바일 전용 물리 버튼 (미니멀리즘 + 고급 글래스모피즘 + 유니코드 심볼) */}
      {!isVisiting && isEditMode && isMobile && showHud && (
        <div className="absolute left-6 top-1/2 -translate-y-1/2 flex flex-col gap-3 z-20 pointer-events-auto">
          
          <button
            onClick={() => godotFrameRef.current?.contentWindow?.postMessage({ type: 'KEY_DOWN', key: 'r' }, '*')}
            className="group w-10 h-10 rounded-full bg-white/[0.05] backdrop-blur-xl border border-white/10 shadow-[0_4px_15px_rgba(0,0,0,0.3)] flex flex-col items-center justify-center text-white/80 active:bg-white/[0.12] active:scale-90 transition-all"
          >
            <span className="text-[15px] font-light group-active:text-cyan-300 transition-colors leading-none">↻</span>
            <span className="text-[7px] font-medium tracking-widest opacity-50 mt-0.5">회전</span>
          </button>

          <button
            onClick={() => godotFrameRef.current?.contentWindow?.postMessage({ type: 'KEY_DOWN', key: 'x' }, '*')}
            className="group w-10 h-10 rounded-full bg-white/[0.05] backdrop-blur-xl border border-white/10 shadow-[0_4px_15px_rgba(0,0,0,0.3)] flex flex-col items-center justify-center text-white/80 active:bg-white/[0.12] active:scale-90 transition-all"
          >
            <span className="text-[13px] font-light group-active:text-red-400 transition-colors leading-none">✕</span>
            <span className="text-[7px] font-medium tracking-widest opacity-50 mt-1">수거</span>
          </button>
          
        </div>
      )}

      {!isVisiting && !isStudioMenuOpen && (
        <>
      {/* 🚨 좌측 하단 제어버튼 (모바일 위치 최적화 수치 조정) */}
<div className={`absolute left-3 md:left-5 w-auto z-50 flex items-center gap-2 pointer-events-none transition-transform duration-500 ease-[cubic-bezier(0.23,1,0.32,1)]
  ${isEditMode && isInvOpen && showHud 
    ? (isMobile ? 'bottom-4 translate-y-[-128px]' : 'bottom-5 translate-y-[-180px]') // 👈 모바일 밀어올리기 수치를 -140px에서 -115px로 하향 조정
    : 'bottom-4 md:bottom-5 translate-y-0'
  }`}
>

  
  
  {/* 1. 조작법 버튼 (PC 전용) */}
  <button onClick={() => setIsHelpOpen(!isHelpOpen)}
    className={`pointer-events-auto hidden md:flex items-center justify-center px-3 py-2 rounded-xl transition-all
      ${showHud ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
    style={{ 
      background: isHelpOpen ? 'rgba(34,211,238,0.15)' : 'rgba(10,6,20,.55)', 
      border: `1px solid ${isHelpOpen ? 'rgba(34,211,238,0.4)' : 'rgba(255,255,255,.08)'}`, 
      color: isHelpOpen ? '#22d3ee' : 'rgba(255,255,255,.6)',
      backdropFilter: 'blur(8px)'
    }}
  >
    <HelpCircle size={13} className="mr-1.5" /> 
    <span className="text-[11px] font-bold">조작법</span>
  </button>

  {/* 2. UI 숨기기 버튼 (모바일에서는 자연스럽게 왼쪽 정렬 및 인벤토리에 밀착) */}
  <button onClick={() => setShowHud(v=>!v)}
    className="pointer-events-auto flex items-center justify-center px-2 py-1.5 md:px-2 md:py-1 transition-colors text-[10px] md:text-[11px] font-bold drop-shadow-md hover:text-white"
    style={{ color: showHud ? 'rgba(255,255,255,.4)' : 'rgba(255,255,255,.9)' }}
  >
    {showHud ? (
      <><ChevronDown size={14} className="mr-1 md:mr-1.5" /> UI 숨기기</>
    ) : (
      <><ChevronUp size={14} className="mr-1 md:mr-1.5" /> UI 보기</>
    )}
  </button>
</div>
        </>
      )}

      {!isVisiting && !isStudioMenuOpen && (
      <div className={`absolute left-3 md:left-5 z-40 pointer-events-auto overflow-hidden transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] origin-bottom-left w-56 md:w-64
        ${showHud && isHelpOpen ? 'max-h-64 opacity-100 scale-100' : 'max-h-0 opacity-0 scale-95'}
        ${isEditMode && isInvOpen && showHud ? (isMobile ? 'bottom-16 translate-y-[-140px]' : 'bottom-16 translate-y-[-180px]') : 'bottom-14 md:bottom-16 translate-y-0'}`}>
        <div className="bg-[#0b101e]/60 border border-white/10 rounded-2xl p-4 md:p-5 shadow-2xl backdrop-blur-xl">
          <h3 className="text-white font-bold text-xs md:text-sm mb-3 md:mb-4 flex items-center gap-2">
            <HelpCircle size={15} className="text-[#22d3ee]"/> 스튜디오 조작법
          </h3>
          <div className="space-y-2 md:space-y-3 text-[10px] md:text-xs text-white/60">
            <p className="flex justify-between border-b border-white/5 pb-1 md:pb-2"><strong className="text-white/90">W, A, S, D</strong> <span>캐릭터 이동</span></p>
            <p className="flex justify-between border-b border-white/5 pb-1 md:pb-2"><strong className="text-white/90">마우스 드래그</strong> <span>시점 전환</span></p>
            <p className="flex justify-between border-b border-white/5 pb-1 md:pb-2"><strong className="text-white/90">마우스 휠</strong> <span>줌 인 / 아웃</span></p>
            <p className="flex justify-between pt-1"><strong className="text-white/90">R / X 키</strong> <span>회전 / 수거</span></p>
          </div>
        </div>
      </div>
      )}

      {/* ─── HUD 전체 래퍼 ─── */}
      <div className="absolute inset-0 z-30 pointer-events-none">
        {isVisiting && (
  <div className="absolute top-6 md:top-7 left-1/2 -translate-x-1/2 z-[999] pointer-events-auto">
    <button
      onClick={handleReturnHome}
      className="
        flex items-center gap-1.5
        px-4 py-2 md:px-4.5 md:py-2.5
        rounded-full
        bg-[#0b101e]/72 hover:bg-[#0b101e]/88
        border border-cyan-300/30 hover:border-cyan-300/60
        text-cyan-100 hover:text-white
        text-[11px] md:text-xs font-black
        tracking-tight whitespace-nowrap
        backdrop-blur-xl
        shadow-[0_10px_32px_rgba(0,0,0,0.38),0_0_16px_rgba(34,211,238,0.13)]
        transition-all duration-200
        active:scale-95
      "
    >
      <DoorOpen size={14} className="text-cyan-300 md:w-4 md:h-4" />
      <span className="md:hidden">돌아가기</span>
      <span className="hidden md:inline">내 작업실로 돌아가기</span>
    </button>
  </div>
)}
        
        <div className={`absolute right-2 md:right-5 w-auto z-50 flex items-center gap-2 pointer-events-none transition-transform duration-500 ease-[cubic-bezier(0.23,1,0.32,1)]
          ${isEditMode && isInvOpen && showHud ? (isMobile ? 'bottom-4 translate-y-[-128px]' : 'bottom-5 translate-y-[-180px]') : 'bottom-4 md:bottom-5 translate-y-0'}`}>
          <MusicPlayer url={playlists[trackIdx % playlists.length]?.url ?? ''} muted={muted} onToggleMute={() => setMuted(m=>!m)} showHud={showHud} />
        </div>

        <div className={`absolute top-4 right-3 md:top-5 md:right-5 flex flex-col items-end gap-2 md:gap-2.5 transition-opacity duration-300 ${showHud ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
          
          
          {/* 1. 햄버거 메뉴 렌더링 (StudioMenu.tsx 전체가 이 한 줄로 치환됨) */}
          <div className="pointer-events-auto">
            <StudioMenu
              sendToGodot={handleStudioMenuMessage}
              onOpenChange={setIsStudioMenuOpen}
              currentUserId={profile.id}
              unlockedRooms={unlockedRooms}
              currentRoomId={currentRoomId}
              onSelectRoom={handleSelectRoom}
              defaultRoomId={defaultRoomId}
              onSetDefaultRoom={handleSetDefaultRoom}
            />
          </div>
          
          
          <button onClick={toggleFullscreen} title={full?'축소':'전체화면'}
            className="pointer-events-auto w-7 h-7 md:w-8 md:h-8 rounded-lg flex items-center justify-center transition-all"
            style={{ background:'rgba(10,6,20,.55)', border:'1px solid rgba(255,255,255,.08)', color:'rgba(255,255,255,.6)', backdropFilter:'blur(8px)' }}
            onMouseEnter={e=>(e.currentTarget.style.color='rgba(255,255,255,.95)')} onMouseLeave={e=>(e.currentTarget.style.color='rgba(255,255,255,.6)')}>
            {full ? <Minimize2 size={14}/> : <Maximize2 size={14}/>}
          </button>
        </div>

        {!isVisiting && (
        <div className={`absolute top-4 left-3 md:top-6 md:left-6 flex flex-col gap-2 pointer-events-none w-52 md:w-[250px] transition-opacity duration-300 ${showHud ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
          
          <div className="bg-[#0b101e]/60 backdrop-blur-xl border border-white/10 rounded-2xl p-3 md:p-4 flex flex-col gap-2 md:gap-3 shadow-[0_10px_40px_rgba(0,0,0,0.5)] pointer-events-auto">
            <div className="flex items-center gap-3 md:gap-4 h-10 md:h-11">
              <div className="w-10 h-10 md:w-11 md:h-11 rounded-full bg-gradient-to-br from-[#f9c76d] to-[#f4a169] flex items-center justify-center text-base md:text-lg font-black text-[#060b18] shadow-[0_0_15px_rgba(249,199,109,0.2)] shrink-0 border border-[#f9c76d]/20">
                {profile.full_name.charAt(0)}
              </div>
              
              <div className="flex flex-col flex-1 min-w-0 justify-between h-full py-[1px]">
                <div className="flex items-center h-5 w-full">
                  {isEditingName ? (
                    <div className="flex items-center w-full h-full border-b border-[#22d3ee]">
                      <input
                        autoFocus
                        value={studioName}
                        onChange={(e) => setStudioName(e.target.value)}
                        onKeyDown={(e) => { 
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleNameSave(); 
                          }
                        }}
                        className="bg-transparent text-[#22d3ee] text-xs md:text-[14px] font-black tracking-tight outline-none w-full min-w-0 py-0 h-full leading-none"
                        placeholder="스튜디오 이름"
                      />
                      <button onMouseDown={(e) => { e.preventDefault(); handleNameSave(); }} className="text-[#22d3ee] hover:text-white shrink-0 pl-2">
                        <Check size={14} strokeWidth={3} />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 max-w-full h-full">
                      <span title="스튜디오 이름" className="text-white/95 text-xs md:text-[14px] font-black tracking-tight drop-shadow-md truncate leading-none pt-0.5">
                        {studioName}
                      </span>
                      <button onClick={() => setIsEditingName(true)} className="text-white/30 hover:text-[#22d3ee] transition-colors shrink-0 p-1 cursor-pointer">
                        <Edit2 size={10} className="md:w-[12px] md:h-[12px]" />
                      </button>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-1.5 text-white/50 text-[9px] md:text-[10px] font-medium truncate h-4 mt-0.5">
                  <span className="px-1.5 py-[1px] rounded border border-[#f9c76d]/40 bg-[#f9c76d]/15 text-[8px] md:text-[9px] font-black text-[#f9c76d] shadow-sm leading-none flex items-center justify-center tracking-widest shrink-0">
                    LV.{info.level}
                  </span>
                  <span className="text-white/60 tracking-wide truncate">
                    {info.name}
                  </span>
                </div>
              </div>
            </div>

            <div className="h-px w-full bg-gradient-to-r from-white/10 to-transparent mt-1" />

            <div className="flex items-center justify-between px-1">
              <span className="text-[9px] md:text-[10px] text-white/50 font-bold tracking-wider">보유 포인트</span>
              <div className="flex items-center gap-1 md:gap-1.5">
                <Star size={10} className="text-[#f9c76d] md:w-3 md:h-3" />
                <span className="text-[#f9c76d] font-bold text-xs md:text-sm leading-none drop-shadow-[0_0_5px_rgba(249,199,109,0.3)]">{profile.points.toLocaleString()}</span>
              </div>
            </div>

            {!isVisiting && (
              <p className="px-1 text-[8px] md:text-[9px] text-white/35 leading-none whitespace-nowrap">
                오늘 {todayVisitCount}명 · 누적 {totalVisitCount}명 방문
              </p>
            )}
          </div>

          <div className="flex items-center justify-between px-1.5 md:px-2 py-1 md:py-1.5 bg-[#0b101e]/60 backdrop-blur-xl border border-white/10 rounded-2xl shadow-xl pointer-events-auto">
            
            {/* 🚨 상점 (Cyan 테마 + 계속 좌우 이동) */}
            <button onClick={() => setIsShopOpen(true)} className="group flex-1 py-1 md:py-1.5 rounded-xl text-white/60 transition-colors duration-300 flex flex-col items-center gap-1 hover:text-cyan-400 hover:bg-cyan-500/10">
              <ShoppingCart size={14} className="md:w-[16px] md:h-[16px] group-hover:animate-shake-x" />
              <span className="text-[9px] md:text-[10px] font-bold tracking-widest mt-0.5">상점</span>
            </button>
            <div className="w-px h-5 md:h-6 bg-white/10" />
            
            {/* 🚨 뽑기 (Amber 테마 + 계속 좌우 갸우뚱) */}
            <button onClick={() => setIsGachaOpen(true)} className="group flex-1 py-1 md:py-1.5 rounded-xl text-white/60 transition-colors duration-300 flex flex-col items-center gap-1 hover:text-amber-300 hover:bg-amber-500/10">
              <Sparkles size={14} className="md:w-[16px] md:h-[16px] group-hover:animate-wiggle" />
              <span className="text-[9px] md:text-[10px] font-bold tracking-widest mt-0.5">뽑기</span>
            </button>
            <div className="w-px h-5 md:h-6 bg-white/10" />
            
            {/* 🚨 거래소 (Purple 테마 + 계속 위아래 점프) */}
            <button onClick={() => setIsTradeOpen(true)} className="group flex-1 py-1 md:py-1.5 rounded-xl text-white/60 transition-colors duration-300 flex flex-col items-center gap-1 hover:text-purple-400 hover:bg-purple-500/10">
              <Store size={14} className="md:w-[16px] md:h-[16px] group-hover:animate-bounce-small" />
              <span className="text-[9px] md:text-[10px] font-bold tracking-widest mt-0.5">거래소</span>
            </button>
            
          </div>

          {playlists.length > 0 && !muted && (
            <div className="flex items-center mt-0.5 md:mt-1.5 w-full pointer-events-auto overflow-hidden px-3 md:px-4">
              <Music2 size={10} className="text-[#22d3ee] md:w-[13px] md:h-[13px] animate-pulse drop-shadow-[0_0_5px_rgba(34,211,238,0.8)] shrink-0 mr-2 md:mr-2.5" />
              <div className="flex-1 overflow-hidden marquee-mask relative h-[14px] md:h-[18px]">
                <div className="animate-marquee-scroll absolute top-0 left-0 text-[9px] md:text-[11.5px] font-medium text-[#22d3ee] tracking-wide drop-shadow-md">
                  {playlists[trackIdx % playlists.length]?.title}
                </div>
              </div>
            </div>
          )}
        </div>
        )}

        {!isVisiting && (
        <div className={`absolute top-4 right-14 md:top-5 md:right-16 pointer-events-auto transition-opacity duration-300 ${showHud ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
          <button onClick={toggleEditMode} disabled={isSaving}
            className={`h-8 px-4 md:h-9 md:px-5 rounded-full flex items-center gap-1.5 md:gap-2 text-[10px] md:text-[11px] font-bold transition-all duration-300 backdrop-blur-md border shadow-lg
              ${isEditMode 
                ? 'bg-emerald-500/20 border-emerald-400/50 text-emerald-400 hover:bg-emerald-500/30 hover:shadow-[0_0_15px_rgba(52,211,153,0.3)]' 
                : 'bg-[#060b18]/60 border-white/10 text-white/90 hover:bg-white/10 hover:text-white'}
              ${isSaving ? 'opacity-50 cursor-wait' : ''}`}>
            {isEditMode ? (
              <><Check size={12} className={`md:w-[13px] md:h-[13px] ${isSaving ? '' : 'animate-pulse drop-shadow-[0_0_3px_rgba(52,211,153,0.8)]'}`} /> <span className="tracking-wide">{isSaving ? '저장 중...' : '배치 완료'}</span></>
            ) : (
              <><Hammer size={12} className="md:w-[13px] md:h-[13px]" /> <span className="tracking-wide">가구 수정</span></>
            )}
          </button>
        </div>
        )}
      </div>

      {!isVisiting && !isStudioMenuOpen && (
        <>
      {/* ─── 🚨 완벽한 반응형 3D 게임 인벤토리 ─── */}
      <div className={`absolute left-0 w-full transition-transform duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] z-40 bottom-0
          ${isEditMode && showHud ? (isInvOpen ? 'translate-y-0' : (isMobile ? 'translate-y-[140px]' : 'translate-y-[180px]')) : (isMobile ? 'translate-y-[250px]' : 'translate-y-[300px]')}`}>
        
        {/* 🚨 상단 부착형 UI (7칸 미니 인벤토리 + 토글 탭 + 우측 삭제 버튼) */}
        <div className="absolute bottom-full left-0 w-full flex flex-col items-center justify-end pointer-events-none">
          
          {/* 1. RPG 미니 인벤토리 (배치 모드 && 인벤토리가 열려있을 때만 렌더링) */}
          {isEditMode && isInvOpen && (() => {
            // 🚨 파싱 자원 낭비 제거: 이미 객체화된 inventory 상태를 그대로 연산에 사용
            const ownedSpecials = STUDIO_ASSETS.filter(a => 
              a.category === 'etc' && a.grade !== 'fail' && (inventory[a.id] || 0) > 0
            );
            
            // 🚨 유동적 슬롯 확장: 기본 7칸 유지, 아이템 획득 시 8, 9, 10칸으로 자동 확장
            const slotCount = Math.max(7, ownedSpecials.length);

            return (
              // 🚨 스크롤 제거, 아이템이 많아질 경우 자연스럽게 줄바꿈(flex-wrap)되도록 처리
              <div className="flex flex-wrap justify-center gap-1 md:gap-1.5 mb-2 pointer-events-auto px-2 max-w-full">
                {Array.from({ length: slotCount }).map((_, idx) => {
                  const meta = ownedSpecials[idx];

                  // 획득하지 못한 슬롯 (어두운 빈칸)
                  if (!meta) {
                    return <div key={`empty-${idx}`} className="w-8 h-8 md:w-11 md:h-11 rounded-lg bg-[#0b101e]/60 border border-white/5 shadow-[inset_0_2px_10px_rgba(0,0,0,0.5)] backdrop-blur-md" />;
                  }

                  // 획득한 슬롯 렌더링
                  const count = inventory[meta.id] || 0;
                  const isTicket = meta.id.startsWith('ticket_');
                  const isClickable = meta.grade === 'passive' || meta.grade === 'special' || isTicket;
                  const isOff = meta.grade === 'passive' && activePassives[meta.id] === false;

                  return (
                    <div key={meta.id} 
                      onClick={(event) => {
                        if (
                          window.innerWidth < 768 &&
                          (miniMobileLongPressTriggeredRef.current || miniMobileLongPressMovedRef.current)
                        ) {
                          event.preventDefault();
                          event.stopPropagation();
                          miniMobileLongPressTriggeredRef.current = false;
                          miniMobileLongPressMovedRef.current = false;
                          return;
                        }

                        if (meta.grade === 'passive') {
                          setActivePassives(prev => {
                            const currentState = prev[meta.id] ?? true;
                            return { ...prev, [meta.id]: !currentState };
                          });
                        } else if (meta.grade === 'special') {
                          setSelectedSpecial(meta);
                        } else if (isTicket) {
                          setSelectedTicket(meta);
                        }
                      }}
                      onPointerDown={(event) => {
                        if (window.innerWidth >= 768 || event.pointerType !== 'touch') return;

                        if (miniMobileInventoryDescriptionCloseTimerRef.current) {
                          clearTimeout(miniMobileInventoryDescriptionCloseTimerRef.current);
                          miniMobileInventoryDescriptionCloseTimerRef.current = null;
                        }
                        if (miniMobileInventoryDescriptionEnterFrameRef.current !== null) {
                          cancelAnimationFrame(miniMobileInventoryDescriptionEnterFrameRef.current);
                          miniMobileInventoryDescriptionEnterFrameRef.current = null;
                        }
                        setMiniMobileInventoryDescriptionVisible(false);
                        setMiniMobileInventoryDescription(null);
                        miniMobileLongPressTriggeredRef.current = false;
                        miniMobileLongPressMovedRef.current = false;
                        miniMobileLongPressStartRef.current = { x: event.clientX, y: event.clientY };

                        if (miniMobileLongPressTimerRef.current) clearTimeout(miniMobileLongPressTimerRef.current);
                        if (!meta.description) return;

                        const rect = event.currentTarget.getBoundingClientRect();
                        const longestLineLength = Math.max(
                          Array.from(meta.name).length,
                          ...meta.description.split('\n').map(line => Array.from(line).length)
                        );
                        const tooltipWidth = Math.min(
                          240,
                          Math.max(48, longestLineLength * 9 + 24),
                          window.innerWidth - 16
                        );
                        const halfTooltipWidth = tooltipWidth / 2;
                        const viewportPadding = 8;
                        const cardCenterX = rect.left + rect.width / 2;
                        const left = Math.min(
                          window.innerWidth - halfTooltipWidth - viewportPadding,
                          Math.max(halfTooltipWidth + viewportPadding, cardCenterX)
                        );
                        const placement = rect.top < 96 ? 'below' : 'above';

                        miniMobileLongPressTimerRef.current = setTimeout(() => {
                          miniMobileLongPressTimerRef.current = null;
                          miniMobileLongPressTriggeredRef.current = true;
                          setMiniMobileInventoryDescription({
                            name: meta.name,
                            description: meta.description,
                            left,
                            top: placement === 'above' ? rect.top - 8 : rect.bottom + 8,
                            placement,
                            cardCenterX,
                            tailLeft: Math.min(
                              tooltipWidth - 12,
                              Math.max(12, tooltipWidth / 2 + cardCenterX - left)
                            ),
                          });
                          miniMobileInventoryDescriptionEnterFrameRef.current = requestAnimationFrame(() => {
                            miniMobileInventoryDescriptionEnterFrameRef.current = null;
                            setMiniMobileInventoryDescriptionVisible(true);
                          });
                        }, 550);
                      }}
                      onPointerMove={(event) => {
                        if (window.innerWidth >= 768 || !miniMobileLongPressStartRef.current) return;

                        const deltaX = event.clientX - miniMobileLongPressStartRef.current.x;
                        const deltaY = event.clientY - miniMobileLongPressStartRef.current.y;
                        if (Math.hypot(deltaX, deltaY) <= 10) return;

                        if (miniMobileLongPressTimerRef.current) {
                          clearTimeout(miniMobileLongPressTimerRef.current);
                          miniMobileLongPressTimerRef.current = null;
                        }
                        miniMobileLongPressStartRef.current = null;
                        miniMobileLongPressMovedRef.current = true;
                        closeMiniMobileInventoryDescription();
                      }}
                      onPointerUp={(event) => {
                        if (window.innerWidth >= 768 || event.pointerType !== 'touch') return;
                        if (miniMobileLongPressTimerRef.current) {
                          clearTimeout(miniMobileLongPressTimerRef.current);
                          miniMobileLongPressTimerRef.current = null;
                        }
                        miniMobileLongPressStartRef.current = null;
                        closeMiniMobileInventoryDescription();
                      }}
                      onPointerCancel={(event) => {
                        if (window.innerWidth >= 768 || event.pointerType !== 'touch') return;
                        if (miniMobileLongPressTimerRef.current) {
                          clearTimeout(miniMobileLongPressTimerRef.current);
                          miniMobileLongPressTimerRef.current = null;
                        }
                        miniMobileLongPressStartRef.current = null;
                        miniMobileLongPressMovedRef.current = true;
                        closeMiniMobileInventoryDescription();
                      }}
                      onContextMenu={(event) => {
                        if (window.innerWidth < 768) event.preventDefault();
                      }}
                      // 🚨 원본 디자인과 모션(hover:scale-105) 완벽 유지
                      className={`group relative w-8 h-8 md:w-11 md:h-11 rounded-lg flex items-center justify-center backdrop-blur-md transition-all duration-300 ${
                        isClickable ? 'cursor-pointer hover:scale-105' : ''
                      } ${
                        isOff 
                          ? 'bg-[#0b101e]/60 border border-white/5 shadow-[inset_0_2px_10px_rgba(0,0,0,0.5)]' 
                          : 'bg-[#0b101e]/90 border border-[#22d3ee]/40 shadow-[0_0_10px_rgba(34,211,238,0.2)]'
                      }`}
                    >
                      <span
                        className={`text-lg md:text-xl transition-all duration-300 ${
                          isOff 
                            ? "opacity-40 grayscale drop-shadow-none" 
                            : "opacity-100 drop-shadow-md group-hover:drop-shadow-[0_0_8px_rgba(34,211,238,0.8)]"
                        }`}
                      >
                        {meta.icon}
                      </span>
                      
                      {/* 패시브가 아닐 때만 개수 뱃지 출력 */}
                      {meta.grade !== 'passive' && (
                        <span className="absolute -bottom-1 -right-1 bg-[#060b18] text-[#22d3ee] text-[8px] md:text-[9px] font-black px-1 md:px-1.5 py-0.5 rounded border border-[#22d3ee]/30 shadow-md">
                          {count}
                        </span>
                      )}
                      
                      {/* Hover 툴팁 (변경 없음) */}
                      <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 opacity-0 md:group-hover:opacity-100 transition-opacity bg-[#060b18]/95 text-white px-3 py-2 rounded-xl whitespace-nowrap z-50 pointer-events-none border border-white/10 shadow-2xl flex flex-col items-center gap-1">
                        <span className="text-[10px] md:text-xs font-black text-[#f9c76d]">{meta.name}</span>
                        <span className="text-[8px] md:text-[9px] text-white/70 font-medium whitespace-pre-line">{meta.description}</span>
                        <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-[#060b18]/95 border-b border-r border-white/10 rotate-45" />
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })()}

          {/* 2. 하단 탭 레이아웃 */}
          <div className="w-full relative flex justify-center items-end h-[28px] md:h-[32px] pointer-events-none">
            
            {/* 🚨 중앙 인벤토리 토글 탭 (단독 중앙 배치) */}
            <div className="pointer-events-auto">
              <button onClick={() => setIsInvOpen(!isInvOpen)} 
                className="flex items-center justify-center gap-1 md:gap-2 px-6 py-1.5 md:px-8 md:py-2 bg-[#0b101e]/60 backdrop-blur-xl border-t border-l border-r border-white/10 border-b-0 rounded-t-xl transition-colors hover:bg-white/10 shadow-[0_-5px_15px_rgba(0,0,0,0.3)]">
                {isInvOpen ? (
                  <><ChevronDown size={14} className="text-cyan-300 drop-shadow-[0_0_8px_rgba(103,232,249,0.8)]" /><span className="text-[10px] md:text-[11px] font-black text-cyan-300 drop-shadow-[0_0_8px_rgba(103,232,249,0.8)] tracking-widest uppercase">Inventory</span></>
                ) : (
                  <><ChevronUp size={14} className="text-cyan-300 drop-shadow-[0_0_8px_rgba(103,232,249,0.8)]" /><span className="text-[10px] md:text-[11px] font-black text-cyan-300 drop-shadow-[0_0_8px_rgba(103,232,249,0.8)] tracking-widest uppercase">Inventory</span></>
                )}
              </button>
            </div>

            {/* 🚨 우측 삭제 모드 탭 (음소거 버튼과의 간섭 방지를 위해 right 값을 대폭 늘려 좌측으로 이동) */}
            {isEditMode && isInvOpen && (
              <button
                onClick={() => setIsTrashMode(!isTrashMode)}
                className={`absolute bottom-0 right-10 md:right-24 w-auto md:w-[110px] justify-center md:justify-start md:pl-3 pointer-events-auto flex items-center gap-1 md:gap-2 px-3 md:px-0 py-1.5 md:py-2 rounded-t-xl border-t border-l border-r border-b-0 transition-all font-bold text-[10px] backdrop-blur-xl whitespace-nowrap
                  ${isTrashMode 
                    ? 'bg-red-500/20 border-red-500/50 text-red-400 shadow-[0_-5px_15px_rgba(239,68,68,0.2)]' 
                    : 'bg-[#0b101e]/60 border-white/10 text-white/50 hover:text-white hover:bg-white/10'}`}
              >
                <Trash2 size={13} className={`shrink-0 ${isTrashMode ? "animate-pulse" : ""}`} />
                <span className="hidden md:inline truncate">삭제 {isTrashMode ? 'ON' : 'OFF'}</span>
                <span className="md:hidden">삭제</span>
              </button>
            )}
            
          </div>
          
        </div>

        {/* 🚨 색상 동기화: bg-[#0b101e]/60 적용 (메인 트랙) */}
        <div className="w-full h-[140px] md:h-[180px] bg-[#0b101e]/60 backdrop-blur-xl border-t border-white/10 pointer-events-auto flex items-center justify-between px-2 md:px-6 shadow-[inset_0_8px_30px_rgba(0,0,0,0.4),0_-20px_50px_rgba(0,0,0,0.6)] relative z-10">

          <button onClick={handlePrevPage} disabled={inventoryPage === 0}
            className="z-30 w-8 h-8 md:w-10 md:h-10 rounded-full bg-[#060b18]/80 border border-white/20 text-white flex items-center justify-center hover:bg-white/10 hover:border-white/50 backdrop-blur-md transition-all shadow-[0_0_15px_rgba(0,0,0,0.5)] hover:scale-110 disabled:opacity-30 disabled:hover:scale-100 disabled:cursor-not-allowed shrink-0">
            <ChevronLeft size={20} className="md:w-6 md:h-6 mr-0.5" />
          </button>

          <div ref={trackWrapperRef} className="flex-1 flex justify-center h-full px-2 md:px-4 items-center">
            
            <div style={{ width: trackConfig.width }} className="overflow-hidden relative h-full flex items-center">
              
              <div className="flex transition-transform duration-500 ease-[cubic-bezier(0.25,1,0.5,1)]"
                   style={{ 
                     gap: `${trackConfig.gapW}px`, 
                     transform: `translateX(-${inventoryPage * (trackConfig.width + trackConfig.gapW)}px)` 
                   }}>
                
                {(() => {
                  const safeInv = deepParse(inventory);
                  const validKeys = Object.keys(safeInv).filter(key => {
                    const val = Number(safeInv[key]);
                    const meta = STUDIO_ASSETS.find(a => a.id.toLowerCase() === key.toLowerCase());
                    const isEtc = meta?.category === 'etc';
                    return !isNaN(val) && val > 0 && !isEtc;
                  });

                  const emptySlotsCount = Math.max(0, TOTAL_SLOTS - validKeys.length);
                  const emptySlots = Array(emptySlotsCount).fill(null);

                  return (
                    <>
                      {validKeys.map((itemName) => {
                        const count = safeInv[itemName];
                        const foundMeta = STUDIO_ASSETS.find(a => a.id.toLowerCase() === itemName.toLowerCase());
                        const meta = foundMeta || { name: itemName, icon: '📦', grade: 'common' };

                        let cardStyle = '';
                        let badgeStyle = '';
                        let gradeLabel = '';

                        switch (meta.grade) {
                          case 'legendary': 
                            cardStyle = 'border border-amber-500/30 bg-[linear-gradient(135deg,rgba(251,191,36,0.15),rgba(0,0,0,0.6))] shadow-[inset_0_0_20px_rgba(251,191,36,0.2)]';
                            badgeStyle = 'bg-amber-500/20 text-amber-300 border border-amber-500/50';
                            gradeLabel = 'L';
                            break;
                          case 'epic': 
                            cardStyle = 'border border-purple-500/30 bg-[linear-gradient(135deg,rgba(168,85,247,0.15),rgba(0,0,0,0.6))] shadow-[inset_0_0_20px_rgba(168,85,247,0.2)]';
                            badgeStyle = 'bg-purple-500/20 text-purple-300 border border-purple-500/50';
                            gradeLabel = 'E';
                            break;
                          case 'rare': 
                            cardStyle = 'border border-blue-500/30 bg-[linear-gradient(135deg,rgba(59,130,246,0.1),rgba(0,0,0,0.6))] shadow-[inset_0_0_15px_rgba(59,130,246,0.1)]';
                            badgeStyle = 'bg-blue-500/20 text-blue-300 border border-blue-500/50';
                            gradeLabel = 'R';
                            break;
                          default: 
                            cardStyle = 'border border-white/10 bg-[linear-gradient(135deg,rgba(255,255,255,0.05),rgba(0,0,0,0.4))] shadow-none';
                            badgeStyle = 'bg-slate-500/10 text-slate-400 border border-white/10';
                            gradeLabel = 'C';
                            break;
                        }

                        return (
                          <button key={itemName} onClick={(event) => {
                            if (
                              window.innerWidth < 768 &&
                              (mobileLongPressTriggeredRef.current || mobileLongPressMovedRef.current)
                            ) {
                              event.preventDefault();
                              event.stopPropagation();
                              mobileLongPressTriggeredRef.current = false;
                              mobileLongPressMovedRef.current = false;
                              return;
                            }

                            if (window.innerWidth < 768) setMobileInventoryDescription(null);
                            handleItemClick(itemName);
                          }}
                            onMouseEnter={(event) => {
                              if (!foundMeta?.description || window.innerWidth < 768) {
                                setHoveredInventoryDescription(null);
                                return;
                              }

                              const rect = event.currentTarget.getBoundingClientRect();
                              const tooltipWidth = Math.min(320, window.innerWidth - 16);
                              const halfTooltipWidth = tooltipWidth / 2;
                              const viewportPadding = 8;
                              const cardCenterX = rect.left + rect.width / 2;
                              const left = Math.min(
                                window.innerWidth - halfTooltipWidth - viewportPadding,
                                Math.max(halfTooltipWidth + viewportPadding, cardCenterX)
                              );
                              const placement = rect.top < 72 ? 'below' : 'above';

                              setHoveredInventoryDescription({
                                description: foundMeta.description,
                                left,
                                top: placement === 'above' ? rect.top - 8 : rect.bottom + 8,
                                placement,
                                cardCenterX,
                                tailLeft: Math.min(
                                  tooltipWidth - 12,
                                  Math.max(12, tooltipWidth / 2 + cardCenterX - left)
                                ),
                              });
                            }}
                            onMouseLeave={() => setHoveredInventoryDescription(null)}
                            onPointerDown={(event) => {
                              if (window.innerWidth >= 768 || event.pointerType !== 'touch') return;

                              if (mobileInventoryDescriptionCloseTimerRef.current) {
                                clearTimeout(mobileInventoryDescriptionCloseTimerRef.current);
                                mobileInventoryDescriptionCloseTimerRef.current = null;
                              }
                              if (mobileInventoryDescriptionEnterFrameRef.current !== null) {
                                cancelAnimationFrame(mobileInventoryDescriptionEnterFrameRef.current);
                                mobileInventoryDescriptionEnterFrameRef.current = null;
                              }
                              setMobileInventoryDescriptionVisible(false);
                              setMobileInventoryDescription(null);
                              mobileLongPressTriggeredRef.current = false;
                              mobileLongPressMovedRef.current = false;
                              mobileLongPressStartRef.current = { x: event.clientX, y: event.clientY };

                              if (mobileLongPressTimerRef.current) clearTimeout(mobileLongPressTimerRef.current);
                              if (!foundMeta?.description) return;

                              const rect = event.currentTarget.getBoundingClientRect();
                              const longestLineLength = Math.max(
                                ...foundMeta.description.split('\n').map(line => Array.from(line).length)
                              );
                              const tooltipWidth = Math.min(
                                240,
                                Math.max(48, longestLineLength * 9 + 24),
                                window.innerWidth - 16
                              );
                              const halfTooltipWidth = tooltipWidth / 2;
                              const viewportPadding = 8;
                              const cardCenter = rect.left + rect.width / 2;
                              const left = Math.min(
                                window.innerWidth - halfTooltipWidth - viewportPadding,
                                Math.max(halfTooltipWidth + viewportPadding, cardCenter)
                              );
                              const placement = rect.top < 72 ? 'below' : 'above';

                              mobileLongPressTimerRef.current = setTimeout(() => {
                                mobileLongPressTimerRef.current = null;
                                mobileLongPressTriggeredRef.current = true;
                                setMobileInventoryDescription({
                                  name: foundMeta.name,
                                  description: foundMeta.description,
                                  left,
                                  top: placement === 'above' ? rect.top - 8 : rect.bottom + 8,
                                  placement,
                                });
                                mobileInventoryDescriptionEnterFrameRef.current = requestAnimationFrame(() => {
                                  mobileInventoryDescriptionEnterFrameRef.current = null;
                                  setMobileInventoryDescriptionVisible(true);
                                });
                              }, 550);
                            }}
                            onPointerMove={(event) => {
                              if (window.innerWidth >= 768 || !mobileLongPressStartRef.current) return;

                              const deltaX = event.clientX - mobileLongPressStartRef.current.x;
                              const deltaY = event.clientY - mobileLongPressStartRef.current.y;
                              if (Math.hypot(deltaX, deltaY) <= 10) return;

                              if (mobileLongPressTimerRef.current) {
                                clearTimeout(mobileLongPressTimerRef.current);
                                mobileLongPressTimerRef.current = null;
                              }
                              mobileLongPressStartRef.current = null;
                              mobileLongPressMovedRef.current = true;
                              closeMobileInventoryDescription();
                            }}
                            onPointerUp={(event) => {
                              if (window.innerWidth >= 768 || event.pointerType !== 'touch') return;
                              if (mobileLongPressTimerRef.current) {
                                clearTimeout(mobileLongPressTimerRef.current);
                                mobileLongPressTimerRef.current = null;
                              }
                              mobileLongPressStartRef.current = null;
                              closeMobileInventoryDescription();
                            }}
                            onPointerCancel={(event) => {
                              if (window.innerWidth >= 768 || event.pointerType !== 'touch') return;
                              if (mobileLongPressTimerRef.current) {
                                clearTimeout(mobileLongPressTimerRef.current);
                                mobileLongPressTimerRef.current = null;
                              }
                              mobileLongPressStartRef.current = null;
                              mobileLongPressMovedRef.current = true;
                              closeMobileInventoryDescription();
                            }}
                            onContextMenu={(event) => {
                              if (window.innerWidth < 768) event.preventDefault();
                            }}
                            style={{ width: trackConfig.itemW, height: trackConfig.itemW }}
                            className={`group relative flex flex-col items-center justify-center rounded-2xl transition-all shrink-0 hover:brightness-125 overflow-hidden ${cardStyle}`}>
                            
                            <div className="absolute inset-0 opacity-20 pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]" />
                            
                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 group-hover:-translate-y-[60%] text-3xl md:text-5xl group-hover:scale-110 transition-transform duration-300 drop-shadow-2xl z-10">
                              {meta.icon}
                            </div>
                            
                            <div className={`absolute top-2 left-2 flex items-center justify-center min-w-[16px] md:min-w-[20px] h-[16px] md:h-[20px] px-1 rounded-md font-black text-[8px] md:text-[9px] border z-20 ${badgeStyle}`}>
                              {gradeLabel}
                            </div>

                            <div className="absolute top-2 right-2 flex items-center justify-center min-w-[16px] md:min-w-[20px] h-[16px] md:h-[20px] px-1 rounded-md font-bold text-[8px] md:text-[9px] bg-[#060b18]/80 border border-white/20 text-white shadow-inner z-20">
                              {count}
                            </div>
                            
                            <div className="absolute bottom-0 left-0 w-full bg-[#060b18]/90 py-1.5 px-1 translate-y-full md:group-hover:translate-y-0 transition-transform duration-300 z-20 border-t border-white/10">
                              <span className="text-[9px] md:text-[10px] font-bold text-white text-center truncate block w-full drop-shadow-md">{meta.name}</span>
                            </div>
                          </button>
                        );           
                      })}
                      
                      {emptySlots.map((_, idx) => (
                        <div key={`empty-${idx}`} 
                             style={{ width: trackConfig.itemW, height: trackConfig.itemW }}
                             className="rounded-2xl bg-[#060b18]/40 border border-[#1e293b]/50 shadow-[inset_0_5px_20px_rgba(0,0,0,0.5)] shrink-0 pointer-events-none" />
                      ))}
                    </>
                  );
                })()}
              </div>
            </div>
          </div>

          <button onClick={handleNextPage} disabled={inventoryPage === MAX_PAGE}
            className="z-30 w-8 h-8 md:w-10 md:h-10 rounded-full bg-[#060b18]/80 border border-white/20 text-white flex items-center justify-center hover:bg-white/10 hover:border-white/50 backdrop-blur-md transition-all shadow-[0_0_15px_rgba(0,0,0,0.5)] hover:scale-110 disabled:opacity-30 disabled:hover:scale-100 disabled:cursor-not-allowed shrink-0">
            <ChevronRight size={20} className="md:w-6 md:h-6 ml-0.5" />
          </button>

        </div>
      </div>
        </>
      )}

      {/* 모달 레이어 */}
      {isShopOpen && (
        <div className="absolute inset-0 z-50 flex items-center justify-center p-4 pointer-events-auto" style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)' }}>
          <StudioShop profile={profile} onClose={() => setIsShopOpen(false)} onUpdate={() => { if (refreshProfile) refreshProfile(); loadStudioData(); }} />
        </div>
      )}
      {isGachaOpen && (
        <div className="absolute inset-0 z-50 flex items-center justify-center p-4 pointer-events-auto" style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)' }}>
          <StudioGacha profile={profile} inventory={inventory} activePassives={activePassives} onClose={() => setIsGachaOpen(false)} onUpdate={() => { if (refreshProfile) refreshProfile(); loadStudioData(); }} />
        </div>
      )}
      {isTradeOpen && (
        <div className="absolute inset-0 z-50 flex items-center justify-center p-4 pointer-events-auto" style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)' }}>
          <StudioAuction onClose={() => setIsTradeOpen(false)} />
        </div>
      )} 

      {/* 🚨 스페셜 아이템 합성 모달 */}
      {selectedSpecial && (
        <div className="absolute inset-0 z-[100] flex items-center justify-center p-4 pointer-events-auto" style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)' }}>
          <SpecialCombineModal 
            profile={profile} 
            inventory={inventory} 
            itemMeta={selectedSpecial} 
            onClose={() => setSelectedSpecial(null)} 
            onSuccess={() => loadStudioData()} 
          />
        </div>
      )}

      {/* 🚨 티켓 사용 모달 */}
      {selectedTicket && (
        <div className="absolute inset-0 z-[100] flex items-center justify-center p-4 pointer-events-auto" style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)' }}>
          <TicketUseModal 
            itemMeta={selectedTicket} 
            onClose={() => setSelectedTicket(null)} 
            onUse={async () => {
              const { data, error } = await supabase.rpc('use_studio_ticket', {
                p_item_key: selectedTicket.id,
              });

              if (error) throw new Error(error.message);

              const latestInventory = deepParse(data);
              setInventory(latestInventory);
              sendToGodot('UPDATE_INVENTORY', {
                inventory_data: JSON.stringify(latestInventory),
              });
              setSelectedTicket(null);
              showTicketNotification('신청이 접수되었습니다.');
            }} 
          />
        </div>
      )}

      {/* 🚨 수정된 삭제 모달 (Trash2 아이콘 적용 + 정확한 슬라이더 채움 공식)*/}
{deleteTarget && (
  <div className="absolute inset-0 z-[100] flex items-center justify-center p-4 pointer-events-auto" style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}>
    <div className="bg-[#0b101e]/95 border border-red-500/30 rounded-2xl p-6 w-full max-w-sm shadow-2xl animate-in zoom-in duration-200">
      <div className="flex flex-col items-center text-center mb-6">
        {/* 🚨 아이콘 교체 */}
        <Trash2 size={40} className="text-white/60 mb-3" />
        
        <h3 className="text-white font-bold text-lg mb-2">아이템 폐기</h3>
        <p className="text-white/60 text-sm leading-relaxed mb-4">
          [{STUDIO_ASSETS.find(a => a.id.toLowerCase() === deleteTarget.toLowerCase())?.name || deleteTarget}]을(를)<br/>정말로 버리시겠습니까?
        </p>
        
        {/* 🚨 슬라이더 (좌우 여백 및 정확한 백분율 계산) */}
        <div className="w-full mt-2">
          <div className="flex justify-between text-xs text-white/50 mb-2 font-bold">
            <span>1개</span>
            <span className="text-[#ef4444]">{deleteQuantity}개 선택</span>
            <span>{inventory[deleteTarget] || 1}개 보유</span>
          </div>
          <input 
            type="range" 
            min="1" 
            max={inventory[deleteTarget] || 1} 
            value={deleteQuantity}
            onChange={(e) => setDeleteQuantity(Number(e.target.value))}
            style={{ 
              background: `linear-gradient(to right, #ef4444 ${((inventory[deleteTarget] || 1) > 1 ? (deleteQuantity - 1) / ((inventory[deleteTarget] || 1) - 1) * 100 : 0)}%, #374151 0%)` 
            }}
            className="w-full h-1 rounded-lg appearance-none cursor-pointer transition-all duration-100"
          />
        </div>
      </div>
      
      <div className="flex gap-3">
        <button onClick={() => setDeleteTarget(null)} className="flex-1 py-3 rounded-xl bg-white/5 border border-white/10 text-white/70 font-bold hover:bg-white/10 hover:text-white transition-all">
          취소
        </button>
        <button onClick={() => handleDiscard(deleteTarget, deleteQuantity)} className="flex-1 py-3 rounded-xl bg-red-500/20 border border-red-500/40 text-red-400 font-bold hover:bg-red-500/30 hover:text-red-300 transition-all shadow-[0_0_15px_rgba(239,68,68,0.2)]">
          버리기
        </button>
      </div>
    </div>
  </div>
)}
    </div>
  );
}
