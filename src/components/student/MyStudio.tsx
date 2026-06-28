import React, { useEffect, useRef, useState } from 'react';
import { Star, Maximize2, Minimize2, ChevronUp, Music2, VolumeX, Volume2 } from 'lucide-react';
import type { Profile } from '../../lib/supabase';
import { supabase } from '../../lib/supabase';

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

function getLevel(pts: number) {
  for (let i = STUDIO_LEVELS.length - 1; i >= 0; i--)
    if (pts >= STUDIO_LEVELS[i].pointsRequired) return STUDIO_LEVELS[i];
  return STUDIO_LEVELS[0];
}

function ProgressBar({ points, info }: { points: number; info: typeof STUDIO_LEVELS[0] }) {
  const pct = info.nextPointsRequired
    ? Math.min(100, ((points - info.pointsRequired) / (info.nextPointsRequired - info.pointsRequired)) * 100)
    : 100;
  return (
    <div>
      <div className="flex justify-between text-[10px] mb-1" style={{ color:'rgba(255,255,255,.35)' }}>
        <span>{info.nextPointsRequired ? `${(info.nextPointsRequired - points).toLocaleString()}pt 남음` : '최고 레벨'}</span>
        <span>{Math.round(pct)}%</span>
      </div>
      <div className="h-1 rounded-full overflow-hidden" style={{ background:'rgba(255,255,255,.08)' }}>
        <div className="h-full rounded-full transition-all duration-1000"
          style={{ width:`${pct}%`, background:'linear-gradient(90deg,#f9c76d,#f4a169,#d4a5f5)' }}/>
      </div>
      <div className="flex gap-1 mt-2">
        {STUDIO_LEVELS.map(l => (
          <div key={l.level} className="flex-1 h-0.5 rounded-full transition-all duration-500"
            style={{ background: l.level <= info.level
              ? 'linear-gradient(90deg,#f9c76d,#f4a169)'
              : 'rgba(255,255,255,.07)' }}/>
        ))}
      </div>
    </div>
  );
}

function useStudioEnv(): StudioEnv {
  const [env, setEnv] = useState<StudioEnv>(DEFAULT_ENV);
  useEffect(() => {
    supabase.from('platform_config').select('value').eq('key','studio_env').maybeSingle()
      .then(({ data }) => {
        if (!data?.value) return;
        try {
          const cfg: StudioEnv = JSON.parse(data.value);
          if (cfg.mode === 'auto') cfg.time = localTime();
          setEnv({ ...DEFAULT_ENV, ...cfg });
        } catch { /* ignore */ }
      });
  }, []);
  useEffect(() => {
    if (env.mode !== 'auto') return;
    const id = setInterval(() => {
      setEnv(e => ({ ...e, time: localTime() }));
    }, 60_000);
    return () => clearInterval(id);
  }, [env.mode]);
  return env;
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

function MusicPlayer({ url, title, onToggleMute, muted }: {
  url: string; title: string; muted: boolean; onToggleMute: () => void;
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
        if (audio.volume > 0.05) {
          audio.volume = Math.max(0, audio.volume - 0.05);
        } else {
          audio.volume = 0;
          audio.pause();
          if (fadeInterval.current) clearInterval(fadeInterval.current);
        }
      }, 100);
    }
  }, [muted, url]); 

  return (
    <div className="flex items-center gap-2">
      <audio ref={audioRef} src={url} loop preload="auto" />
      <button onClick={onToggleMute}
        className="w-8 h-8 rounded-lg flex items-center justify-center transition-all"
        style={{ background:'rgba(10,6,20,.55)', border:'1px solid rgba(255,255,255,.08)',
                 color: muted ? 'rgba(255,255,255,.6)' : '#f9c76d', backdropFilter:'blur(8px)' }}
        onMouseEnter={e=>(e.currentTarget.style.color='rgba(255,255,255,.95)')}
        onMouseLeave={e=>(e.currentTarget.style.color= muted ? 'rgba(255,255,255,.6)' : '#f9c76d')}
        title={muted ? '음악 켜기' : '음악 끄기'}>
        {muted ? <VolumeX size={13}/> : <Volume2 size={13}/>}
      </button>
    </div>
  );
}

// ─── Main export ───────────────────────────────────────────────────────────
export function MyStudio({ profile }: { profile: Profile }) {
  const info = getLevel(profile.points);
  const env  = useStudioEnv();
  const playlists = usePlaylists(env.theme);
  const [full, setFull]   = useState(false);
  const [showHud, setShowHud] = useState(true);
  const [muted, setMuted] = useState(false);
  const [trackIdx, setTrackIdx] = useState(0);

  const godotFrameRef = useRef<HTMLIFrameElement>(null);

  // 🚨 [추가/수정] 날씨/시간 정보가 바뀔 때마다 고도 엔진으로 메시지 전송!
  useEffect(() => {
    if (godotFrameRef.current && godotFrameRef.current.contentWindow) {
      godotFrameRef.current.contentWindow.postMessage({
        type: 'env_update',
        data: env
      }, '*');
    }
  }, [env]);

  useEffect(() => { return () => setMuted(true); }, []);
  useEffect(() => { setTrackIdx(0); }, [playlists.length]);

  const containerStyle: React.CSSProperties = full
    ? { position:'fixed', top:56, left:0, right:0, bottom:0, zIndex:40 }
    : { height:'calc(100vh - 102px)', minHeight:400 };

  return (
    <div 
      className="relative overflow-hidden select-none bg-[#060b18]"
      style={containerStyle}
    >
      {/* 🚨 React가 드래그를 가로채지 않고, Iframe 안에서 자체적으로 드래그되도록 수정 */}
      <iframe
        ref={godotFrameRef}
        src="https://extraordinary-sunshine-489308.netlify.app"
        title="3D Room Viewer"
        allow="autoplay"
        style={{ 
          width: '100%', 
          height: '100%', 
          position: 'absolute', 
          inset: 0, 
          border: 'none',
          pointerEvents: 'auto' // 고도 안에서 마우스 조작 가능
        }}
      />

      {/* ── HUD visibility toggle ── */}
      <button onClick={() => setShowHud(v=>!v)}
        className="absolute bottom-4 left-4 z-10 flex items-center gap-1.5 text-[10px] transition-colors"
        style={{ color: showHud ? 'rgba(255,255,255,.28)' : 'rgba(255,255,255,.5)' }}>
        <ChevronUp size={10} style={{ transform: showHud ? 'none' : 'rotate(180deg)' }}/>
        {showHud ? 'UI 숨기기' : 'UI 보기'}
      </button>

      {/* ── Music Player (React 줌/팬 버튼은 삭제됨) ── */}
      <div className="absolute bottom-4 right-4 z-10 flex flex-col gap-1.5">
        {playlists.length > 0 && (
          <MusicPlayer
            url={playlists[trackIdx % playlists.length]?.url ?? ''}
            title={playlists[trackIdx % playlists.length]?.title ?? ''}
            muted={muted}
            onToggleMute={() => setMuted(m=>!m)}
          />
        )}
      </div>

      {/* ── Fullscreen toggle ── */}
      <button onClick={() => setFull(v=>!v)} title={full?'축소':'전체화면'}
        className="absolute top-4 right-4 z-10 w-9 h-9 rounded-xl flex items-center justify-center transition-all"
        style={{ background:'rgba(10,6,20,.55)', border:'1px solid rgba(255,255,255,.08)',
                 color:'rgba(255,255,255,.6)', backdropFilter:'blur(8px)' }}
        onMouseEnter={e=>(e.currentTarget.style.color='rgba(255,255,255,.95)')}
        onMouseLeave={e=>(e.currentTarget.style.color='rgba(255,255,255,.6)')}>
        {full ? <Minimize2 size={14}/> : <Maximize2 size={14}/>}
      </button>

      {/* ── Floating HUD (프로필, 경험치 바 유지) ── */}
      {showHud && (
        <div className="absolute top-4 left-4 z-10 flex flex-col gap-2 pointer-events-none">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl"
            style={{ background:'rgba(8,5,18,.6)', backdropFilter:'blur(12px)',
                     border:'1px solid rgba(255,255,255,.07)' }}>
            <div className="text-[9px] font-bold tracking-widest uppercase"
              style={{ color:'#f9c76d' }}>Lv.{info.level}</div>
            <div className="w-px h-3" style={{ background:'rgba(255,255,255,.1)' }}/>
            <div className="text-[11px] font-semibold" style={{ color:'rgba(255,255,255,.8)' }}>
              {info.name}
            </div>
          </div>

          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl"
            style={{ background:'rgba(8,5,18,.6)', backdropFilter:'blur(12px)',
                     border:'1px solid rgba(255,255,255,.07)' }}>
            <div className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold shrink-0"
              style={{ background:'linear-gradient(135deg,#f9c76d,#f4a169)' }}>
              {profile.full_name.charAt(0)}
            </div>
            <span className="text-[11px] font-medium" style={{ color:'rgba(255,255,255,.75)' }}>
              {profile.full_name}
            </span>
            <div className="w-px h-3" style={{ background:'rgba(255,255,255,.1)' }}/>
            <Star size={9} style={{ color:'#f9c76d' }}/>
            <span className="text-[11px] font-bold" style={{ color:'#f9c76d' }}>
              {profile.points.toLocaleString()}
            </span>
          </div>

          <div className="px-3 py-2 rounded-xl w-48"
            style={{ background:'rgba(8,5,18,.6)', backdropFilter:'blur(12px)',
                     border:'1px solid rgba(255,255,255,.07)' }}>
            <ProgressBar points={profile.points} info={info} />
          </div>

          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl"
            style={{ background:'rgba(8,5,18,.6)', backdropFilter:'blur(12px)',
                     border:'1px solid rgba(255,255,255,.07)' }}>
            <span className="text-[11px]">
              {({'morning':'🌅','afternoon':'☀️','evening':'🌆','night':'🌙'})[env.time]}
            </span>
            <span className="text-[11px]">
              {({'sunny':'✨','cloudy':'☁️','rainy':'🌧'})[env.weather]}
            </span>
            {playlists.length > 0 && !muted && (
              <>
                <div className="w-px h-3" style={{ background:'rgba(255,255,255,.1)' }}/>
                <Music2 size={9} style={{ color:'#f9c76d' }}/>
                <span className="text-[9px] truncate max-w-[80px]"
                  style={{ color:'rgba(255,255,255,.5)' }}>
                  {playlists[trackIdx % playlists.length]?.title}
                </span>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}