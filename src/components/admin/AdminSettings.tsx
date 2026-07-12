import React, { useState, useEffect, useCallback } from 'react';
import { Settings, Save, CheckCircle, Music, Sun, Cloud, CloudRain, Clock, Palette, Plus, Trash2, GripVertical, Database, RefreshCw } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { Button } from '../ui/Button';
import { PasswordChange } from '../shared/PasswordChange';
import type { EnvTime, EnvWeather, EnvTheme, StudioEnv } from '../student/MyStudio';

// ─── Studio env section ───────────────────────────────────────────────────
const TIME_OPTS:    { v: EnvTime;    label: string }[] = [
  {v:'morning',  label:'아침'}, {v:'afternoon', label:'낮'},
  {v:'evening',  label:'저녁'}, {v:'night',     label:'밤'},
];
const WEATHER_OPTS: { v: EnvWeather; label: string; icon: React.ElementType }[] = [
  {v:'sunny', label:'맑음', icon:Sun}, {v:'cloudy', label:'흐림', icon:Cloud},
  {v:'rainy', label:'비',   icon:CloudRain},
];
const THEME_OPTS:   { v: EnvTheme;   label: string }[] = [
  {v:'default',   label:'기본'},   {v:'spring',    label:'봄'},
  {v:'summer',    label:'여름'},   {v:'autumn',    label:'가을'},
  {v:'winter',    label:'겨울'},   {v:'christmas', label:'크리스마스'},
  {v:'halloween', label:'할로윈'},
];

const DEFAULT_ENV: StudioEnv = { mode:'auto', time:'night', weather:'sunny', theme:'default' };

interface Playlist { id:string; title:string; url:string; season_tag:string; sort_order:number; is_active:boolean }

interface AdminDataStatus {
  database_size_bytes: number | string;
  database_size_pretty: string;
  student_count: number | string;
  reservation_count: number | string;
  time_slot_count: number | string;
  notification_count: number | string;
  old_notification_count: number | string;
  studio_visit_count: number | string;
  checked_at: string;
}

function formatCount(value: number | string | undefined): string {
  const text = String(value ?? 0);
  const numeric = Number(text);
  return Number.isSafeInteger(numeric) ? numeric.toLocaleString('ko-KR') : text;
}

function StudioSettings() {
  const [env,       setEnv]       = useState<StudioEnv | null>(null);
  const [envLoading, setEnvLoading] = useState(true);
  const [envError, setEnvError] = useState('');
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [newTitle,  setNewTitle]  = useState('');
  const [newUrl,    setNewUrl]    = useState('');
  const [newTag,    setNewTag]    = useState('all');
  const [saving,    setSaving]    = useState(false);
  const [saved,     setSaved]     = useState(false);
  const [addingPl,  setAddingPl]  = useState(false);

  const loadEnv = useCallback(async () => {
    setEnvLoading(true);
    setEnvError('');

    const { data, error } = await supabase
      .from('platform_config')
      .select('value')
      .eq('key', 'studio_env')
      .maybeSingle();

    if (error) {
      console.error('[AdminSettings] failed to load studio_env', error);
      setEnvError('작업실 환경 설정을 불러오지 못했습니다.');
      setEnvLoading(false);
      return;
    }

    console.log('[AdminSettings] loaded studio_env raw', data?.value);

    if (!data?.value) {
      setEnv({ ...DEFAULT_ENV });
      setEnvLoading(false);
      return;
    }

    try {
      const parsed = typeof data.value === 'string' ? JSON.parse(data.value) : data.value;
      console.log('[AdminSettings] parsed studio_env', parsed);
      setEnv({ ...DEFAULT_ENV, ...parsed });
    } catch (error) {
      console.error('[AdminSettings] failed to parse studio_env', error);
      setEnvError('저장된 작업실 환경 설정의 형식이 올바르지 않습니다.');
    } finally {
      setEnvLoading(false);
    }
  }, []);

  useEffect(() => {
    loadEnv();
    loadPlaylists();
  }, [loadEnv]);

  async function loadPlaylists() {
    const { data } = await supabase.from('studio_playlists').select('*').order('sort_order');
    setPlaylists(data || []);
  }

  async function saveEnv() {
    if (!env || envLoading) return;

    setSaving(true);
    setEnvError('');
    console.log('[AdminSettings] saving studio_env', env);
    const { error } = await supabase.from('platform_config')
      .upsert({ key:'studio_env', value: JSON.stringify(env), updated_at: new Date().toISOString() },
               { onConflict:'key' });

    if (error) {
      console.error('[AdminSettings] failed to save studio_env', error);
      setEnvError('작업실 환경 설정을 저장하지 못했습니다.');
      setSaving(false);
      return;
    }

    setSaved(true); setSaving(false);
    setTimeout(()=>setSaved(false), 3000);
  }

  async function addPlaylist() {
    if (!newTitle.trim() || !newUrl.trim()) return;
    setAddingPl(true);
    await supabase.from('studio_playlists').insert({
      title: newTitle.trim(), url: newUrl.trim(),
      season_tag: newTag, sort_order: playlists.length,
    });
    setNewTitle(''); setNewUrl(''); setNewTag('all');
    await loadPlaylists(); setAddingPl(false);
  }

  async function togglePlaylist(id: string, active: boolean) {
    await supabase.from('studio_playlists').update({ is_active: active }).eq('id', id);
    setPlaylists(p => p.map(x => x.id===id ? {...x,is_active:active} : x));
  }

  async function deletePlaylist(id: string) {
    await supabase.from('studio_playlists').delete().eq('id', id);
    setPlaylists(p => p.filter(x => x.id !== id));
  }

  const chip = (active: boolean, onClick: ()=>void, children: React.ReactNode) => (
    <button type="button" onClick={onClick}
      className="px-3 py-1.5 rounded-lg text-xs font-medium border transition-all"
      style={{ borderColor: active ? '#22d3ee' : '#e2e8f0',
               background:  active ? '#ecfeff'  : 'white',
               color:       active ? '#0891b2'  : '#64748b' }}>
      {children}
    </button>
  );

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-6">
      <h3 className="font-semibold text-slate-900 flex items-center gap-2">
        <Palette size={16} className="text-violet-500" />
        내 작업실 환경 설정
      </h3>

      {saved && (
        <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl px-4 py-3 text-sm">
          <CheckCircle size={16}/> 저장되었습니다.
        </div>
      )}

      {envLoading && (
        <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-500">
          작업실 환경 설정을 불러오는 중...
        </div>
      )}

      {envError && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {envError}
        </div>
      )}

      {env && !envLoading && <>
      {/* Mode */}
      <div>
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
          <Clock size={11}/> 환경 모드
        </p>
        <div className="flex gap-2">
          {chip(env.mode==='auto',  ()=>setEnv(e=>e ? ({...e,mode:'auto'}) : e),  '자동 (현지 시간)')}
          {chip(env.mode==='manual',()=>setEnv(e=>e ? ({...e,mode:'manual'}) : e),'수동 설정')}
        </div>
      </div>

      {/* Time (manual only) */}
      <div style={{ opacity: env.mode==='manual' ? 1 : .4, pointerEvents: env.mode==='manual' ? 'auto' : 'none' }}>
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
          <Sun size={11}/> 시간대
        </p>
        <div className="flex gap-2 flex-wrap">
          {TIME_OPTS.map(o => chip(env.time===o.v, ()=>setEnv(e=>e ? ({...e,time:o.v}) : e), o.label))}
        </div>
      </div>

      {/* Weather */}
      <div>
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
          <Cloud size={11}/> 날씨
        </p>
        <div className="flex gap-2">
          {WEATHER_OPTS.map(o => chip(env.weather===o.v, ()=>setEnv(e=>e ? ({...e,weather:o.v}) : e),
            <span className="flex items-center gap-1"><o.icon size={11}/>{o.label}</span>
          ))}
        </div>
      </div>

      {/* Theme */}
      <div>
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
          <Palette size={11}/> 시즌 테마
        </p>
        <div className="flex gap-2 flex-wrap">
          {THEME_OPTS.map(o => chip(env.theme===o.v, ()=>setEnv(e=>e ? ({...e,theme:o.v}) : e), o.label))}
        </div>
      </div>

      <Button onClick={saveEnv} loading={saving}>
        <Save size={14}/> 환경 설정 저장
      </Button>
      </>}

      {/* ── Playlist manager */}
      <div className="pt-4 border-t border-slate-100">
        <h4 className="font-semibold text-slate-800 flex items-center gap-2 mb-4">
          <Music size={15} className="text-violet-500"/>
          작업실 플레이리스트
        </h4>

        <div className="space-y-2 mb-4">
          {playlists.map(pl => (
            <div key={pl.id} className="flex items-center gap-3 bg-slate-50 rounded-xl px-3 py-2.5 border border-slate-100">
              <GripVertical size={14} className="text-slate-300 shrink-0"/>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-800 truncate">{pl.title}</p>
                <p className="text-xs text-slate-400 truncate">{pl.url}</p>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-violet-100 text-violet-600 shrink-0">
                {pl.season_tag}
              </span>
              <button onClick={()=>togglePlaylist(pl.id,!pl.is_active)}
                className={`text-[10px] px-2 py-0.5 rounded-full shrink-0 transition-colors ${
                  pl.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-400'}`}>
                {pl.is_active ? '활성' : '비활성'}
              </button>
              <button onClick={()=>deletePlaylist(pl.id)}
                className="text-slate-300 hover:text-red-400 transition-colors shrink-0">
                <Trash2 size={13}/>
              </button>
            </div>
          ))}
          {playlists.length === 0 && (
            <p className="text-sm text-slate-400 text-center py-4">등록된 플레이리스트가 없습니다.</p>
          )}
        </div>

        {/* Add new */}
        <div className="bg-slate-50 rounded-xl border border-slate-200 p-4 space-y-3">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">새 트랙 추가</p>
          <input value={newTitle} onChange={e=>setNewTitle(e.target.value)}
            placeholder="트랙 이름"
            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-300"/>
          <input value={newUrl} onChange={e=>setNewUrl(e.target.value)}
            placeholder="YouTube embed URL (https://www.youtube.com/embed/...)"
            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-300"/>
          <div className="flex gap-2 items-center">
            <select value={newTag} onChange={e=>setNewTag(e.target.value)}
              className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-300 bg-white">
              <option value="all">전체 시즌</option>
              <option value="spring">봄</option>
              <option value="summer">여름</option>
              <option value="autumn">가을</option>
              <option value="winter">겨울</option>
              <option value="christmas">크리스마스</option>
              <option value="halloween">할로윈</option>
            </select>
            <Button onClick={addPlaylist} loading={addingPl} disabled={!newTitle||!newUrl}>
              <Plus size={13}/> 추가
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function DataStatusCard() {
  const [status, setStatus] = useState<AdminDataStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadDataStatus = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const { data, error: rpcError } = await supabase.rpc('get_admin_data_status');
      const row = (Array.isArray(data) ? data[0] : data) as AdminDataStatus | null;

      if (rpcError || !row) {
        setError('데이터 상태를 불러오지 못했습니다.');
        return;
      }

      setStatus(row);
    } catch (loadError) {
      console.warn('데이터 상태 조회 실패:', loadError);
      setError('데이터 상태를 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDataStatus();
  }, [loadDataStatus]);

  const metrics = status ? [
    { label: '학생 수', value: formatCount(status.student_count) },
    { label: '예약 기록', value: formatCount(status.reservation_count) },
    { label: '예약 슬롯', value: formatCount(status.time_slot_count) },
    { label: '알림 기록', value: formatCount(status.notification_count) },
    { label: '90일 지난 알림', value: formatCount(status.old_notification_count) },
    { label: '작업실 방문 기록', value: formatCount(status.studio_visit_count) },
  ] : [];

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6">
      <div className="flex items-start justify-between gap-4 mb-5">
        <div>
          <h3 className="font-semibold text-slate-900 flex items-center gap-2">
            <Database size={16} className="text-slate-500" />
            데이터 상태
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            Free 플랜 운영을 위한 데이터 사용량과 주요 기록 개수를 확인합니다.
          </p>
        </div>
        <Button
          type="button"
          size="sm"
          variant="secondary"
          loading={loading}
          disabled={loading}
          onClick={loadDataStatus}
        >
          <RefreshCw size={13} />
          새로고침
        </Button>
      </div>

      {error && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {status ? (
        <>
          <div className="mb-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
            <p className="text-xs font-medium text-slate-500">DB 전체 용량</p>
            <p className="mt-1 text-xl font-bold text-slate-900">
              {String(status.database_size_pretty)}
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {metrics.map(metric => (
              <div key={metric.label} className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-3">
                <p className="text-xs text-slate-500">{metric.label}</p>
                <p className="mt-1 text-base font-semibold text-slate-900">{metric.value}</p>
              </div>
            ))}
          </div>

          <p className="mt-4 text-xs text-slate-400">
            마지막 확인 시간: {new Date(status.checked_at).toLocaleString('ko-KR')}
          </p>
        </>
      ) : !error ? (
        <div className="py-8 text-center text-sm text-slate-400">
          데이터 상태를 불러오는 중...
        </div>
      ) : null}
    </div>
  );
}

export function AdminSettings() {
  const [webhook, setWebhook] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('platform_config')
        .select('value')
        .eq('key', 'discord_webhook')
        .maybeSingle();
      setWebhook(data?.value || '');
      setLoading(false);
    }
    load();
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    await supabase
      .from('platform_config')
      .upsert({ key: 'discord_webhook', value: webhook, updated_at: new Date().toISOString() }, { onConflict: 'key' });
    setSaved(true);
    setSaving(false);
    setTimeout(() => setSaved(false), 3000);
  }

  return (
    <div className="space-y-5">
      <div className="bg-white rounded-2xl border border-slate-200 p-6">
        <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
          <Settings size={16} className="text-slate-500" />
          플랫폼 설정
        </h3>

        {saved && (
          <div className="mb-4 flex items-center gap-2 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl px-4 py-3 text-sm">
            <CheckCircle size={16} />
            설정이 저장되었습니다.
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="text-sm font-medium text-slate-700 block mb-1.5">
              디스코드 웹훅 URL
            </label>
            <input
              type="url"
              value={webhook}
              onChange={(e) => setWebhook(e.target.value)}
              placeholder="https://discord.com/api/webhooks/..."
              disabled={loading}
              className="w-full px-3 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-slate-500 disabled:bg-slate-50"
            />
            <p className="text-xs text-slate-400 mt-1">
              모든 예약, 취소, 패널티 알림이 이 채널로 전송됩니다.
            </p>
          </div>
          <Button type="submit" loading={saving} disabled={loading}>
            <Save size={14} />
            설정 저장
          </Button>
        </form>
      </div>

      <StudioSettings />

      <DataStatusCard />

      <PasswordChange />
    </div>
  );
}
