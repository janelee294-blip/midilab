import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  BarChart2, TrendingUp, TrendingDown,
  AlertTriangle, Calculator, RefreshCw, Shield, AlertCircle, Info,
  Settings, X, PlusCircle, RotateCcw, ChevronDown, ChevronUp, Clock, FlaskConical,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import {
  insertFinancialEvent, cancelFinancialEvent, saveBiConfig, fetchFinancialData,
  saveCapacityConfig, type CapacityConfig,
} from '../../lib/adminApi';

// ─── Types ────────────────────────────────────────────────────────────────────

type Period = '30d' | '90d' | '6m' | '12m' | 'all';

interface ReservationRow {
  id: string;
  user_id: string;
  created_at: string;
}

interface FinancialEvent {
  id: string;
  student_id: string;
  type: 'revenue' | 'cost' | 'deferred_cost';
  amount: number;
  apply_month: string | null;
  source: string | null;
  note: string | null;
  created_at: string;
  is_cancelled: boolean;
}

interface ProfileRow {
  id: string;
  full_name: string;
  tickets: number;
  unit_price: number;
  status: string;
}

interface Alert {
  level: 'critical' | 'warning' | 'info';
  title: string;
  body: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const PERIODS: { value: Period; label: string }[] = [
  { value: '30d', label: '30일' },
  { value: '90d', label: '90일' },
  { value: '6m', label: '6개월' },
  { value: '12m', label: '12개월' },
  { value: 'all', label: '전체' },
];

function getPeriodStart(p: Period): string | null {
  if (p === 'all') return null;
  const d = new Date();
  if (p === '30d') d.setDate(d.getDate() - 30);
  else if (p === '90d') d.setDate(d.getDate() - 90);
  else if (p === '6m') d.setMonth(d.getMonth() - 6);
  else d.setFullYear(d.getFullYear() - 1);
  return d.toISOString();
}

function fmtKRW(n: number) {
  return Math.abs(n).toLocaleString('ko-KR') + '원';
}

function fmtSign(n: number) {
  return n < 0 ? `−${fmtKRW(n)}` : fmtKRW(n);
}

function fmtPct(n: number) {
  return (n * 100).toFixed(1) + '%';
}

function sum(arr: number[]) {
  return arr.reduce((s, v) => s + v, 0);
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' });
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────

const ACCENT_MAP = {
  cyan:    { icon: 'text-cyan-400 bg-cyan-500/10',      text: 'text-cyan-400',    ring: 'hover:border-cyan-500/40' },
  emerald: { icon: 'text-emerald-400 bg-emerald-500/10', text: 'text-emerald-400', ring: 'hover:border-emerald-500/40' },
  amber:   { icon: 'text-amber-400 bg-amber-500/10',    text: 'text-amber-400',   ring: 'hover:border-amber-500/40' },
  red:     { icon: 'text-red-400 bg-red-500/10',        text: 'text-red-400',     ring: 'hover:border-red-500/40' },
  slate:   { icon: 'text-slate-400 bg-slate-500/10',    text: 'text-slate-300',   ring: 'hover:border-slate-500/40' },
} as const;
type AccentKey = keyof typeof ACCENT_MAP;

function KpiCard({ label, value, sub, icon, accent, negative, onClick }: {
  label: string; value: string; sub: string; icon: React.ReactNode;
  accent: AccentKey; negative?: boolean; onClick?: () => void;
}) {
  const cls = ACCENT_MAP[accent];
  return (
    <div
      onClick={onClick}
      className={`bg-gray-900 rounded-xl p-5 border border-gray-800 flex flex-col gap-3 transition-colors
        ${onClick ? `cursor-pointer ${cls.ring} active:scale-[0.99]` : 'hover:border-gray-700'}`}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{label}</span>
        <div className={`p-1.5 rounded-lg ${cls.icon}`}>{icon}</div>
      </div>
      <div>
        <p className={`text-2xl font-bold leading-tight ${negative ? 'text-red-400' : 'text-white'}`}>{value}</p>
        <p className="text-xs text-gray-600 mt-1">{sub}</p>
      </div>
      {onClick && (
        <p className="text-[10px] text-gray-700 -mt-1">클릭하여 비용 입력 →</p>
      )}
    </div>
  );
}

// ─── Alert Banner ─────────────────────────────────────────────────────────────

function AlertBanner({ alert }: { alert: Alert }) {
  const cfg = {
    critical: { bg: 'bg-red-500/10 border-red-500/30',   icon: <AlertCircle size={15} className="text-red-400 shrink-0 mt-0.5" />,   title: 'text-red-400',   body: 'text-red-300' },
    warning:  { bg: 'bg-amber-500/10 border-amber-500/30', icon: <AlertTriangle size={15} className="text-amber-400 shrink-0 mt-0.5" />, title: 'text-amber-400', body: 'text-amber-300' },
    info:     { bg: 'bg-blue-500/10 border-blue-500/30',  icon: <Info size={15} className="text-blue-400 shrink-0 mt-0.5" />,          title: 'text-blue-400',  body: 'text-blue-300' },
  }[alert.level];
  return (
    <div className={`flex gap-3 px-4 py-3 rounded-lg border ${cfg.bg}`}>
      {cfg.icon}
      <div>
        <p className={`text-xs font-semibold ${cfg.title}`}>{alert.title}</p>
        <p className={`text-xs mt-0.5 ${cfg.body}`}>{alert.body}</p>
      </div>
    </div>
  );
}

// ─── Cost Entry Modal ─────────────────────────────────────────────────────────

function CostEntryModal({ open, onClose, onSaved }: {
  open: boolean; onClose: () => void; onSaved: () => void;
}) {
  const [note, setNote] = useState('');
  const [amount, setAmount] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  if (!open) return null;

  async function handleSave() {
    const amt = Number(amount.replace(/[^0-9]/g, ''));
    if (!note.trim()) { setError('항목명을 입력하세요.'); return; }
    if (!amt || amt <= 0) { setError('금액을 올바르게 입력하세요.'); return; }
    setError('');
    setSaving(true);
    const { error: err } = await insertFinancialEvent({
      type: 'cost',
      amount: -amt,
      source: 'manual',
      note: note.trim(),
    });
    setSaving(false);
    if (err) { setError('저장 실패: ' + err); return; }
    setNote('');
    setAmount('');
    onSaved();
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <PlusCircle size={15} className="text-red-400" />
            즉각 비용 직접 입력
          </h3>
          <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors"><X size={16} /></button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="text-xs text-gray-500 block mb-1.5">항목명 <span className="text-red-400">*</span></label>
            <input
              type="text" value={note} onChange={e => setNote(e.target.value)}
              placeholder="예: 마케팅비, 리워드 상금, 수수료..."
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-red-500"
            />
          </div>
          <div>
            <label className="text-xs text-gray-500 block mb-1.5">금액 (원) <span className="text-red-400">*</span></label>
            <input
              type="text" value={amount} onChange={e => setAmount(e.target.value)}
              placeholder="예: 50000"
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-red-500"
            />
          </div>
          {error && <p className="text-xs text-red-400">{error}</p>}
          <p className="text-xs text-gray-600">
            환불 비용은 환불 승인 시 자동 반영됩니다. 이 입력창은 리워드·상금·마케팅 등 수동 비용 전용입니다.
          </p>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-400 text-xs font-semibold rounded-lg transition-colors">취소</button>
          <button type="button" onClick={handleSave} disabled={saving} className="px-4 py-2 bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white text-xs font-semibold rounded-lg transition-colors">
            {saving ? '저장 중...' : '저장'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── BEP Modal (DB 영구 저장) ──────────────────────────────────────────────────

function BepModal({ open, onClose, fixedCost, targetRevenue, onChange }: {
  open: boolean; onClose: () => void;
  fixedCost: string; targetRevenue: string;
  onChange: (field: 'fixedCost' | 'targetRevenue', value: string) => void;
}) {
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  if (!open) return null;

  async function handleConfirm() {
    setSaving(true);
    setSaveError('');
    const { error } = await saveBiConfig(fixedCost, targetRevenue);
    setSaving(false);
    if (error) { setSaveError(`저장 실패: ${error}`); return; }
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Calculator size={15} className="text-cyan-400" />
            손익분기점 설정
          </h3>
          <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors"><X size={16} /></button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="text-xs text-gray-500 block mb-1.5">월 고정비 (원)</label>
            <input
              type="text" value={fixedCost} onChange={e => onChange('fixedCost', e.target.value)}
              placeholder="예: 500,000"
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-white placeholder-gray-700 focus:outline-none focus:ring-1 focus:ring-cyan-500"
            />
          </div>
          <div>
            <label className="text-xs text-gray-500 block mb-1.5">목표 월매출 (원)</label>
            <input
              type="text" value={targetRevenue} onChange={e => onChange('targetRevenue', e.target.value)}
              placeholder="예: 2,000,000"
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-white placeholder-gray-700 focus:outline-none focus:ring-1 focus:ring-cyan-500"
            />
          </div>
          <p className="text-xs text-gray-600">저장된 값은 DB에 영구 보관되어 새로고침 후에도 유지됩니다.</p>
          {saveError && (
            <p className="text-xs font-medium text-red-400 bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2">
              {saveError}
            </p>
          )}
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-400 text-xs font-semibold rounded-lg transition-colors">취소</button>
          <button type="button" onClick={handleConfirm} disabled={saving} className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white text-xs font-semibold rounded-lg transition-colors">
            {saving ? '저장 중...' : 'DB에 저장'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Capacity Modal (DB 영구 저장) ────────────────────────────────────────────

function CapacityModal({ open, onClose, sessionTime, desiredHours, maxHours, onChange, onSaved }: {
  open: boolean; onClose: () => void;
  sessionTime: string; desiredHours: string; maxHours: string;
  onChange: (field: keyof CapacityConfig, value: string) => void;
  onSaved: (cfg: CapacityConfig) => void;
}) {
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  if (!open) return null;

  async function handleConfirm() {
    setSaving(true);
    setSaveError('');
    const st = sessionTime !== '' ? parseFloat(sessionTime) : null;
    const dh = desiredHours !== '' ? parseFloat(desiredHours) : null;
    const mh = maxHours !== '' ? parseFloat(maxHours) : null;
    const { error } = await saveCapacityConfig(st, dh, mh);
    setSaving(false);
    if (error) { setSaveError(`저장 실패: ${error}`); return; }
    onSaved({ sessionTime: st, desiredHours: dh, maxHours: mh });
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Clock size={15} className="text-emerald-400" />
            시간 가동 기준값 설정
          </h3>
          <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors"><X size={16} /></button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="text-xs text-gray-500 block mb-1.5">회당 소요 시간 (수업 + 준비/피드백, 시간)</label>
            <input
              type="number" min="0" step="0.5" value={sessionTime}
              onChange={e => onChange('sessionTime', e.target.value)}
              placeholder="예: 1.5"
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-white placeholder-gray-700 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>
          <div>
            <label className="text-xs text-gray-500 block mb-1.5">희망 할당 시간 (월간 목표 레슨 총시간)</label>
            <input
              type="number" min="0" step="1" value={desiredHours}
              onChange={e => onChange('desiredHours', e.target.value)}
              placeholder="예: 40"
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-white placeholder-gray-700 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>
          <div>
            <label className="text-xs text-gray-500 block mb-1.5">최대 가능 시간 (월간 물리적 최대 레슨 시간)</label>
            <input
              type="number" min="0" step="1" value={maxHours}
              onChange={e => onChange('maxHours', e.target.value)}
              placeholder="예: 60"
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-white placeholder-gray-700 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>
          <p className="text-xs text-gray-600">저장된 값은 DB에 영구 보관되어 새로고침 후에도 유지됩니다.</p>
          {saveError && (
            <p className="text-xs font-medium text-red-400 bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2">
              {saveError}
            </p>
          )}
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-400 text-xs font-semibold rounded-lg transition-colors">취소</button>
          <button type="button" onClick={handleConfirm} disabled={saving} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-semibold rounded-lg transition-colors">
            {saving ? '저장 중...' : 'DB에 저장'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Ledger Panel (롤백 기능) ──────────────────────────────────────────────────

const SOURCE_LABEL: Record<string, string> = {
  task: '과제', league: '리그', manual: '수동', refund: '환불',
  reward: '리워드', subscription: '재등록',
};

const TYPE_STYLE: Record<string, string> = {
  revenue:       'bg-cyan-500/15 text-cyan-400',
  cost:          'bg-red-500/15 text-red-400',
  deferred_cost: 'bg-amber-500/15 text-amber-400',
};

const TYPE_LABEL: Record<string, string> = {
  revenue: '매출', cost: '비용', deferred_cost: '이연',
};

function LedgerPanel({ allEvents, onRollback }: {
  allEvents: FinancialEvent[];
  onRollback: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [rollingBack, setRollingBack] = useState<string | null>(null);

  const sorted = [...allEvents].sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, 50);

  async function handleRollback(ev: FinancialEvent) {
    if (!window.confirm(`[${TYPE_LABEL[ev.type]}] ${ev.note ?? ev.source ?? '—'} (${fmtKRW(Math.abs(ev.amount))}) 항목을 취소하시겠습니까?\n\n이 작업은 재무 수치에서 즉시 제외되며, 데이터는 보존됩니다.`)) return;
    setRollingBack(ev.id);
    const { error } = await cancelFinancialEvent(ev.id);
    setRollingBack(null);
    if (!error) onRollback(ev.id);
  }

  return (
    <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full px-5 py-4 flex items-center justify-between hover:bg-gray-800/40 transition-colors"
      >
        <div className="flex items-center gap-2">
          <RotateCcw size={13} className="text-gray-500" />
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">재무 내역 관리 (롤백)</p>
          <span className="text-xs text-gray-700">{sorted.length}건</span>
        </div>
        {open ? <ChevronUp size={14} className="text-gray-600" /> : <ChevronDown size={14} className="text-gray-600" />}
      </button>

      {open && (
        <div className="border-t border-gray-800">
          <p className="px-5 py-2.5 text-xs text-gray-600 bg-gray-800/30">
            취소 처리 시 DB에서 물리적으로 삭제되지 않고 '무효' 상태로 변경됩니다. 모든 계산식에서 즉시 제외됩니다.
          </p>
          <div className="divide-y divide-gray-800/60 max-h-80 overflow-y-auto">
            {sorted.length === 0 ? (
              <p className="px-5 py-8 text-center text-gray-700 text-sm">내역 없음</p>
            ) : sorted.map(ev => (
              <div key={ev.id} className={`px-5 py-3 flex items-center gap-3 ${ev.is_cancelled ? 'opacity-40' : ''}`}>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${TYPE_STYLE[ev.type]}`}>
                  {TYPE_LABEL[ev.type]}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-gray-300 truncate">{ev.note ?? SOURCE_LABEL[ev.source ?? ''] ?? ev.source ?? '—'}</p>
                  <p className="text-[10px] text-gray-600">{fmtDate(ev.created_at)} · {SOURCE_LABEL[ev.source ?? ''] ?? ev.source}</p>
                </div>
                <span className={`text-xs font-semibold shrink-0 ${ev.amount < 0 ? 'text-red-400' : 'text-cyan-400'}`}>
                  {ev.amount < 0 ? `−${fmtKRW(ev.amount)}` : fmtKRW(ev.amount)}
                </span>
                {ev.is_cancelled ? (
                  <span className="text-[10px] text-gray-600 border border-gray-700 rounded-full px-2 py-0.5 shrink-0">취소됨</span>
                ) : (
                  <button
                    onClick={() => handleRollback(ev)}
                    disabled={rollingBack === ev.id}
                    className="shrink-0 text-[10px] text-gray-600 hover:text-amber-400 border border-gray-700 hover:border-amber-500/50 rounded-full px-2 py-0.5 transition-colors"
                  >
                    {rollingBack === ev.id ? '처리 중' : '취소'}
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Simulator Modal (localStorage only — never touches DB) ──────────────────

const SIM_KEY = 'midilab_revenue_sim';

function loadSimValues() {
  try {
    const raw = localStorage.getItem(SIM_KEY);
    if (!raw) return { maxHours: '80', targetHours: '40', lessonFee: '200000', freelanceRevenue: '500000' };
    return JSON.parse(raw);
  } catch {
    return { maxHours: '80', targetHours: '40', lessonFee: '200000', freelanceRevenue: '500000' };
  }
}

function SimulatorModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [vals, setVals] = useState(loadSimValues);

  useEffect(() => { if (open) setVals(loadSimValues()); }, [open]);

  const parseNum = (val: string) => parseFloat(val.replace(/[^0-9.]/g, '')) || 0;

  function set(k: string, v: string) {
    const next = { ...vals, [k]: v };
    setVals(next);
    localStorage.setItem(SIM_KEY, JSON.stringify(next));
  }

  if (!open) return null;

  const maxHours = parseNum(vals.maxHours);
  const targetHours = parseNum(vals.targetHours);
  const fee = parseNum(vals.lessonFee);
  const freelance = parseNum(vals.freelanceRevenue);

  // 1. 계산 로직 분리
  const calc = (hours: number) => {
    const students = Math.floor(hours / 6);
    const monthly = (students * fee) + freelance;
    return { students, monthly, annual: monthly * 12 };
  };

  const maxRes = calc(maxHours);
  const targetRes = calc(targetHours);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
      <div className="bg-gray-900 border border-gray-800 rounded-3xl p-8 w-full max-w-2xl shadow-2xl">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h2 className="text-xl font-bold text-white tracking-tight">수익 시뮬레이션</h2>
            <p className="text-gray-500 text-sm mt-1">목표와 최대 한계치를 비교 분석합니다.</p>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors"><X size={20} /></button>
        </div>

        {/* 입력 섹션 */}
        <div className="grid grid-cols-2 gap-4 mb-8">
          {[
            { label: '최대 가용 시간 (h)', k: 'maxHours', v: vals.maxHours },
            { label: '희망 목표 시간 (h)', k: 'targetHours', v: vals.targetHours },
            { label: '레슨비 (원)', k: 'lessonFee', v: vals.lessonFee },
            { label: '외주 수익 (원)', k: 'freelanceRevenue', v: vals.freelanceRevenue },
          ].map((item, i) => (
            <div key={i}>
              <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1.5 block">{item.label}</label>
              <input type="text" value={item.v} onChange={e => set(item.k, e.target.value)} 
                     className="w-full bg-gray-950 border border-gray-800 rounded-xl px-4 py-3 text-sm text-white focus:border-violet-500 outline-none transition-all" />
            </div>
          ))}
        </div>

        {/* 결과 카드 섹션 */}
        <div className="grid grid-cols-2 gap-4">
          {/* Target Card */}
          <div className="bg-gradient-to-br from-violet-900/40 to-gray-900 border border-violet-500/30 rounded-2xl p-5">
            <h3 className="text-violet-300 font-semibold text-sm mb-4">희망 목표 결과</h3>
            <div className="space-y-4">
              <ResultRow label="수용 가능 인원" value={`${targetRes.students}명`} />
              <ResultRow label="예상 월 수익" value={`${targetRes.monthly.toLocaleString()}원`} />
              <ResultRow label="예상 연간 수익" value={`${targetRes.annual.toLocaleString()}원`} />
            </div>
          </div>

          {/* Max Card */}
          <div className="bg-gray-800/40 border border-gray-700 rounded-2xl p-5">
            <h3 className="text-gray-300 font-semibold text-sm mb-4">최대 가용 결과</h3>
            <div className="space-y-4">
              <ResultRow label="수용 가능 인원" value={`${maxRes.students}명`} />
              <ResultRow label="예상 월 수익" value={`${maxRes.monthly.toLocaleString()}원`} />
              <ResultRow label="예상 연간 수익" value={`${maxRes.annual.toLocaleString()}원`} />
            </div>
          </div>
        </div>

        <button onClick={onClose} className="w-full mt-8 py-4 bg-white text-black font-bold rounded-xl hover:bg-gray-200 transition-colors text-sm">확인 완료</button>
      </div>
    </div>
  );
}

function ResultRow({ label, value }: { label: string, value: string }) {
  return (
    <div className="flex justify-between items-center border-b border-white/5 pb-2 last:border-0">
      <span className="text-xs text-gray-400">{label}</span>
      <span className="text-sm font-bold text-white tracking-tight">{value}</span>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function InsightsDashboard() {
  const [period, setPeriod] = useState<Period>('90d');
  const [reservations, setReservations] = useState<ReservationRow[]>([]);
  // allEvents: ALL events including cancelled (for ledger); activeEvents: only non-cancelled
  const [allEvents, setAllEvents] = useState<FinancialEvent[]>([]);
  const [profiles, setProfiles] = useState<ProfileRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [fixedCost, setFixedCost] = useState('');
  const [targetRevenue, setTargetRevenue] = useState('');
  const [isBepModalOpen, setIsBepModalOpen] = useState(false);
  const [isCapacityModalOpen, setIsCapacityModalOpen] = useState(false);
  const [isSimulatorOpen, setIsSimulatorOpen] = useState(false);
  const [showCostModal, setShowCostModal] = useState(false);
  const [sessionTime, setSessionTime] = useState('');
  const [desiredHours, setDesiredHours] = useState('');
  const [maxHours, setMaxHours] = useState('');

  // BEP + Capacity settings initialized from DB on first load only
  const biSettingsInitializedRef = useRef(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    const start = getPeriodStart(period);

    // Non-financial data — direct supabase (anon access OK for reservations/profiles)
    let resQ = supabase
      .from('reservations')
      .select('id, user_id, created_at')
      .in('status', ['confirmed', 'completed'])
      .order('created_at');
    if (start) resQ = resQ.gte('created_at', start);

    const prQ = supabase
      .from('profiles')
      .select('id, full_name, tickets, unit_price, status')
      .eq('role', 'student');

    // Financial data — via secure Edge Function (validates Bearer session token)
    const [{ data: r1 }, { data: r3 }, finData] = await Promise.all([
      resQ,
      prQ,
      fetchFinancialData(),
    ]);

    setReservations((r1 ?? []) as ReservationRow[]);
    setProfiles((r3 ?? []) as ProfileRow[]);
    setAllEvents(finData.events as FinancialEvent[]);

    // Apply BEP + Capacity config only on first successful load
    if (!biSettingsInitializedRef.current) {
      if (finData.biConfig) {
        setFixedCost(String(finData.biConfig.fixedCost ?? ''));
        setTargetRevenue(String(finData.biConfig.targetRevenue ?? ''));
      }
      if (finData.capacityConfig) {
        const c = finData.capacityConfig;
        setSessionTime(c.sessionTime != null ? String(c.sessionTime) : '');
        setDesiredHours(c.desiredHours != null ? String(c.desiredHours) : '');
        setMaxHours(c.maxHours != null ? String(c.maxHours) : '');
      }
      biSettingsInitializedRef.current = true;
    }

    setLoading(false);
  }, [period]);

  useEffect(() => { loadData(); }, [loadData]);

  // When an event is rolled back client-side, mark it cancelled in state immediately
  function handleRollback(id: string) {
    setAllEvents(prev => prev.map(e => e.id === id ? { ...e, is_cancelled: true } : e));
  }

  // ─── Core Metrics (only non-cancelled events) ─────────────────────────────

  const metrics = useMemo(() => {
    const nameMap = Object.fromEntries(profiles.map(p => [p.id, p.full_name]));

    const start = getPeriodStart(period);
    // Active = non-cancelled; period-filtered
    const activeEvents = allEvents.filter(e => !e.is_cancelled);
    const periodEvents = start
      ? activeEvents.filter(e => e.created_at >= start)
      : activeEvents;

    // Revenue: financial_events type='revenue' (재등록 승인 시 과제할인 차감 후 자동 기록)
    const revenue = sum(periodEvents.filter(e => e.type === 'revenue').map(e => e.amount));

    // Immediate costs: type='cost' — includes approved refunds (auto) + manual entries
    const immediateCost = sum(periodEvents.filter(e => e.type === 'cost').map(e => e.amount));

    const netRevenue = revenue + immediateCost;

    const activeStudentIds = new Set(
      periodEvents.filter(e => e.type === 'revenue').map(e => e.student_id).filter(Boolean)
    );
    const activeStudents = activeStudentIds.size;
    const netArpu = activeStudents > 0 ? netRevenue / activeStudents : 0;
    const leakageRate = revenue > 0 ? Math.abs(immediateCost) / revenue : 0;

    // Total deferred liability: Σ(tickets × unit_price) for active students
    const totalDeferredLiability = sum(
      profiles
        .filter(p => p.status === 'active')
        .map(p => (p.tickets ?? 0) * (p.unit_price ?? 0))
    );

    // Cost breakdown by source (for reference panel)
    const costBySource: Record<string, number> = {};
    periodEvents.filter(e => e.type === 'cost').forEach(e => {
      const src = SOURCE_LABEL[e.source ?? ''] ?? e.source ?? '기타';
      costBySource[src] = (costBySource[src] ?? 0) + Math.abs(e.amount);
    });

    // Student profitability
    const studentMap: Record<string, { revenue: number; cost: number; lessons: number }> = {};
    periodEvents.filter(e => e.type === 'revenue' && e.student_id).forEach(e => {
      if (!studentMap[e.student_id]) studentMap[e.student_id] = { revenue: 0, cost: 0, lessons: 0 };
      studentMap[e.student_id].revenue += e.amount;
    });
    reservations.forEach(r => {
      if (!studentMap[r.user_id]) studentMap[r.user_id] = { revenue: 0, cost: 0, lessons: 0 };
      studentMap[r.user_id].lessons++;
    });
    periodEvents.filter(e => e.type === 'cost' && e.student_id).forEach(e => {
      if (!studentMap[e.student_id]) studentMap[e.student_id] = { revenue: 0, cost: 0, lessons: 0 };
      studentMap[e.student_id].cost += Math.abs(e.amount);
    });

    const studentData = Object.entries(studentMap)
      .map(([id, d]) => ({ id, name: nameMap[id] ?? '—', ...d, net: d.revenue - d.cost }))
      .sort((a, b) => b.net - a.net);

    return {
      revenue, immediateCost, netRevenue, activeStudents,
      netArpu, leakageRate, costBySource, studentData, totalDeferredLiability,
    };
  }, [allEvents, reservations, profiles, period]);

  // ─── Alerts ───────────────────────────────────────────────────────────────

  const alerts = useMemo((): Alert[] => {
    const a: Alert[] = [];
    const { revenue, leakageRate, netArpu, totalDeferredLiability, studentData } = metrics;

    if (revenue > 0 && totalDeferredLiability > revenue * 0.5) {
      a.push({
        level: 'critical',
        title: '이연 부채 과다 경고',
        body: `남은 수업 부채 (${fmtKRW(totalDeferredLiability)})가 기간 매출의 ${fmtPct(totalDeferredLiability / revenue)}에 달합니다. 선결제 학생 수업 제공 속도를 점검하세요.`,
      });
    }

    if (leakageRate > 0.30 && revenue > 0) {
      a.push({
        level: 'warning',
        title: '높은 누수율 경고',
        body: `환불·리워드·기타 비용이 매출의 ${fmtPct(leakageRate)}를 차지합니다. 보상 구조 재검토를 권장합니다.`,
      });
    }

    if (netArpu < 0 && revenue > 0) {
      a.push({
        level: 'warning',
        title: '순 ARPU 마이너스',
        body: '비용 공제 후 학생 1인당 수익이 음수입니다. 할인·환불 구조를 즉시 점검하세요.',
      });
    }

    if (studentData.length >= 5) {
      const top20Count = Math.max(1, Math.ceil(studentData.length * 0.2));
      const top20Rev = sum(studentData.slice(0, top20Count).map(s => s.revenue));
      const totalRev = sum(studentData.map(s => s.revenue));
      if (totalRev > 0 && top20Rev / totalRev > 0.75) {
        a.push({
          level: 'info',
          title: '수익 집중도 리스크',
          body: `상위 20% (${top20Count}명)가 전체 매출의 ${fmtPct(top20Rev / totalRev)}를 창출합니다. 핵심 학생 이탈 시 매출 충격이 큽니다.`,
        });
      }
    }

    return a;
  }, [metrics]);

  // ─── BEP ──────────────────────────────────────────────────────────────────

  const fc = Number(fixedCost.replace(/[^0-9]/g, '')) || 0;
  const tr = Number(targetRevenue.replace(/[^0-9]/g, '')) || 0;
  const bepStudents = metrics.netArpu > 0 && fc > 0 ? Math.ceil(fc / metrics.netArpu) : null;
  const targetStudents = metrics.netArpu > 0 && tr > 0 ? Math.ceil(tr / metrics.netArpu) : null;

  const netRevenueAccent: AccentKey = metrics.netRevenue >= 0 ? 'emerald' : 'red';
  const leakageAccent: AccentKey = metrics.leakageRate > 0.30 ? 'red' : metrics.leakageRate > 0.15 ? 'amber' : 'emerald';

  // Modals are declared outside the loading gate so they are NEVER unmounted
  // by a loading state change. Previously the early-return on loading=true was
  // destroying the modal mid-flight (triggering the visible "flash/blink").
  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <SimulatorModal open={isSimulatorOpen} onClose={() => setIsSimulatorOpen(false)} />
      <CostEntryModal open={showCostModal} onClose={() => setShowCostModal(false)} onSaved={loadData} />
      <BepModal
        open={isBepModalOpen} onClose={() => setIsBepModalOpen(false)}
        fixedCost={fixedCost} targetRevenue={targetRevenue}
        onChange={(field, value) => {
          if (field === 'fixedCost') setFixedCost(value);
          else setTargetRevenue(value);
        }}
      />
      <CapacityModal
        open={isCapacityModalOpen} onClose={() => setIsCapacityModalOpen(false)}
        sessionTime={sessionTime} desiredHours={desiredHours} maxHours={maxHours}
        onChange={(field, value) => {
          if (field === 'sessionTime') setSessionTime(value);
          else if (field === 'desiredHours') setDesiredHours(value);
          else setMaxHours(value);
        }}
        onSaved={cfg => {
          setSessionTime(cfg.sessionTime != null ? String(cfg.sessionTime) : '');
          setDesiredHours(cfg.desiredHours != null ? String(cfg.desiredHours) : '');
          setMaxHours(cfg.maxHours != null ? String(cfg.maxHours) : '');
        }}
      />

      {loading ? (
        <div className="min-h-screen flex items-center justify-center">
          <RefreshCw size={20} className="animate-spin text-gray-500" />
        </div>
      ) : (
      <div className="max-w-7xl mx-auto p-6 space-y-6">

        {/* Header */}
<div className="flex items-start justify-between flex-wrap gap-4">
  {/* 왼쪽 영역: 제목 및 모바일용 시뮬레이터 버튼 */}
  <div className="w-full md:w-auto">
    <div className="flex items-center justify-between md:justify-start gap-2">
      <h1 className="text-xl font-bold text-white flex items-center gap-2">
        <BarChart2 size={20} className="text-cyan-400" />
        Business Intelligence
      </h1>
      
      <button
        onClick={() => setIsSimulatorOpen(true)}
        className="md:hidden flex items-center gap-1.5 px-3 py-1.5 bg-gray-900 border border-gray-800 hover:border-violet-500/50 text-gray-400 hover:text-violet-300 rounded-lg text-xs font-medium transition-all shrink-0"
      >
        <FlaskConical size={13} />
        시뮬레이터
      </button>
    </div>
    <p className="text-xs text-gray-600 mt-1">CFO 레벨 재무 분석</p>
  </div>
  
  {/* 오른쪽 영역: PC용 시뮬레이터 버튼 및 기간 선택 */}
  <div className="flex items-center gap-2 w-full md:w-auto">
    <button
      onClick={() => setIsSimulatorOpen(true)}
      className="hidden md:flex items-center gap-1.5 px-3 py-1.5 bg-gray-900 border border-gray-800 hover:border-violet-500/50 text-gray-400 hover:text-violet-300 rounded-lg text-xs font-medium transition-all shrink-0"
    >
      <FlaskConical size={13} />
      시뮬레이터
    </button>

    <div className="flex w-full md:w-auto gap-1 bg-gray-900 rounded-lg p-1 border border-gray-800">
      {PERIODS.map(p => (
        <button
          key={p.value} 
          onClick={() => setPeriod(p.value)}
          className={`flex-1 md:flex-initial px-3 py-1.5 rounded-md text-xs font-medium transition-all ${period === p.value ? 'bg-cyan-500 text-white' : 'text-gray-400 hover:text-white'}`}
        >
          {p.label}
        </button>
      ))}
    </div>
  </div>
</div>

        {/* Alerts */}
        {alerts.length > 0 && (
          <div className="space-y-2">
            {alerts.map((alert, i) => <AlertBanner key={i} alert={alert} />)}
          </div>
        )}

        {/* KPI Row 1 */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <KpiCard
            label="매출" value={fmtKRW(metrics.revenue)}
            sub="재등록 승인 매출 (과제할인 차감 후)"
            icon={<TrendingUp size={14} />} accent="cyan"
          />
          {/* 즉각 비용: 클릭하면 수동 비용 입력 모달 */}
          <KpiCard
            label="즉각 비용"
            value={metrics.immediateCost < 0 ? `−${fmtKRW(metrics.immediateCost)}` : '—'}
            sub="환불(자동) + 수동 입력 합산"
            icon={<TrendingDown size={14} />} accent="red"
            negative={metrics.immediateCost < 0}
            onClick={() => setShowCostModal(true)}
          />
          <KpiCard
            label="순매출" value={fmtSign(metrics.netRevenue)}
            sub="매출 − 즉각 비용"
            icon={metrics.netRevenue >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
            accent={netRevenueAccent} negative={metrics.netRevenue < 0}
          />
          <KpiCard
            label="누수율"
            value={metrics.revenue > 0 ? fmtPct(metrics.leakageRate) : '—'}
            sub="즉각비용 / 매출"
            icon={<AlertTriangle size={14} />} accent={leakageAccent}
          />
        </div>

        {/* KPI Row 2 */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
          <KpiCard
            label="순 ARPU"
            value={metrics.netArpu > 0 ? fmtKRW(Math.round(metrics.netArpu)) : metrics.netArpu < 0 ? `−${fmtKRW(Math.abs(Math.round(metrics.netArpu)))}` : '—'}
            sub={`비용 공제 후 인당 순이익 · 활성 ${metrics.activeStudents}명`}
            icon={<Shield size={14} />}
            accent={metrics.netArpu < 0 ? 'red' : 'emerald'}
            negative={metrics.netArpu < 0}
          />
          {/* 총 이연 부채 */}
          <div className="lg:col-span-2 bg-gray-900 rounded-xl p-5 border border-amber-500/20 flex flex-col gap-3 hover:border-amber-500/40 transition-colors">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">총 이연 부채</span>
              <div className="p-1.5 rounded-lg text-amber-400 bg-amber-500/10"><Calculator size={14} /></div>
            </div>
            <div>
              <p className="text-2xl font-bold leading-tight text-amber-400">
                {metrics.totalDeferredLiability > 0 ? fmtKRW(metrics.totalDeferredLiability) : '—'}
              </p>
              <p className="text-xs text-gray-600 mt-1">활성 학생 잔여 티켓 × 회당 단가 합계 — 미제공 수업 가치</p>
            </div>
            {profiles.filter(p => p.status === 'active' && p.tickets > 0).length > 0 && (
              <div className="border-t border-gray-800 pt-3 grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-1 max-h-32 overflow-y-auto">
                {profiles
                  .filter(p => p.status === 'active' && p.tickets > 0)
                  .sort((a, b) => (b.tickets * b.unit_price) - (a.tickets * a.unit_price))
                  .map(p => (
                    <div key={p.id} className="flex justify-between items-baseline gap-2 min-w-0">
                      <span className="text-xs text-gray-500 truncate">{p.full_name}</span>
                      <span className="text-xs text-amber-400 shrink-0">{fmtKRW(p.tickets * p.unit_price)}</span>
                    </div>
                  ))}
              </div>
            )}
          </div>
        </div>

        {/* Cost breakdown by source */}
        {Object.keys(metrics.costBySource).length > 0 && (
          <div className="bg-gray-900 rounded-xl border border-gray-800 p-5">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">비용 출처별 분류</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {Object.entries(metrics.costBySource)
                .sort(([, a], [, b]) => b - a)
                .map(([src, amt]) => (
                  <div key={src} className="bg-gray-800 rounded-lg p-3">
                    <p className="text-xs text-gray-500 mb-1">{src}</p>
                    <p className="text-sm font-semibold text-red-400">{fmtKRW(amt)}</p>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* BEP Calculator */}
        <div className="bg-gray-900 rounded-xl border border-gray-800 p-5">
          <div className="flex items-center justify-between mb-4">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
              <Calculator size={12} />손익분기점 계산기
            </p>
            <button
              onClick={() => setIsBepModalOpen(true)}
              className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-cyan-400 transition-colors border border-gray-700 hover:border-cyan-500/50 rounded-lg px-3 py-1.5"
            >
              <Settings size={11} />기준값 설정 (DB 저장)
            </button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-gray-800 rounded-lg p-4">
              <p className="text-xs text-gray-500 mb-1">BEP 필요 학생 수</p>
              <p className="text-2xl font-bold text-white">{bepStudents !== null ? `${bepStudents}명` : fc > 0 ? '계산 불가' : '—'}</p>
              {fc > 0 && metrics.netArpu <= 0 && <p className="text-xs text-red-400 mt-1">순 ARPU ≤ 0</p>}
              {bepStudents !== null && <p className="text-xs text-gray-600 mt-1">월 고정비 {fmtKRW(fc)} 기준</p>}
              {fc === 0 && <p className="text-xs text-gray-700 mt-1">기준값 설정에서 고정비 입력</p>}
            </div>
            <div className="bg-gray-800 rounded-lg p-4">
              <p className="text-xs text-gray-500 mb-1">목표 달성 학생 수</p>
              <p className="text-2xl font-bold text-white">{targetStudents !== null ? `${targetStudents}명` : tr > 0 ? '계산 불가' : '—'}</p>
              {tr > 0 && metrics.netArpu <= 0 && <p className="text-xs text-red-400 mt-1">순 ARPU ≤ 0</p>}
              {targetStudents !== null && <p className="text-xs text-gray-600 mt-1">목표 {fmtKRW(tr)}</p>}
              {tr === 0 && <p className="text-xs text-gray-700 mt-1">기준값 설정에서 목표매출 입력</p>}
            </div>
          </div>
          {metrics.netArpu > 0 && metrics.activeStudents > 0 && (
            <div className="mt-3 p-3 bg-gray-800/60 rounded-lg">
              <p className="text-xs text-gray-500">
                현재 {metrics.activeStudents}명 활성 / 순 ARPU {fmtKRW(Math.round(metrics.netArpu))} &rarr;
                현재 순매출 <span className={metrics.netRevenue >= 0 ? 'text-emerald-400' : 'text-red-400'}>{fmtSign(metrics.netRevenue)}</span>
              </p>
            </div>
          )}
        </div>

        {/* Capacity Analysis Card */}
        {(() => {
          const stNum = parseFloat(sessionTime) || 0;
          const dhNum = parseFloat(desiredHours) || 0;
          const mhNum = parseFloat(maxHours) || 0;
          const periodMonths = period === '30d' ? 1 : period === '90d' ? 3 : period === '6m' ? 6 : period === '12m' ? 12 : 1;
          const avgLessonsPerMonth = metrics.activeStudents > 0
            ? reservations.length / metrics.activeStudents / periodMonths
            : 0;
          const timePerStudent = stNum > 0 && avgLessonsPerMonth > 0 ? avgLessonsPerMonth * stNum : 0;
          const hourlyRate = timePerStudent > 0 && metrics.netArpu > 0 ? metrics.netArpu / timePerStudent : 0;
          const desiredCapacity = timePerStudent > 0 && dhNum > 0 ? Math.floor(dhNum / timePerStudent) : null;
          const desiredRevenue = desiredCapacity !== null ? desiredCapacity * metrics.netArpu : 0;
          const maxCapacity = timePerStudent > 0 && mhNum > 0 ? Math.floor(mhNum / timePerStudent) : null;
          const maxRevenue = maxCapacity !== null ? maxCapacity * metrics.netArpu : 0;

          const hasInputs = stNum > 0 && (dhNum > 0 || mhNum > 0);

          return (
            <div className="bg-gray-900 rounded-xl border border-gray-800 p-5">
              <div className="flex items-center justify-between mb-4">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                  <Clock size={12} />시간 대비 가동 능력 (Capacity)
                </p>
                <button
                  onClick={() => setIsCapacityModalOpen(true)}
                  className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-emerald-400 transition-colors border border-gray-700 hover:border-emerald-500/50 rounded-lg px-3 py-1.5"
                >
                  <Settings size={11} />기준값 설정 (DB 저장)
                </button>
              </div>

              {!hasInputs ? (
                <p className="text-xs text-gray-700 py-4 text-center">기준값 설정에서 회당 소요 시간과 희망/최대 시간을 입력하세요.</p>
              ) : (
                <>
                  {/* 현재 시급 강조 */}
                  <div className="flex flex-col items-center justify-center py-4 mb-4 bg-gray-800/60 rounded-xl">
                    <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">현재 시급</p>
                    {hourlyRate > 0 ? (
                      <>
                        <p className="text-3xl font-bold text-emerald-400">{fmtKRW(Math.round(hourlyRate))}<span className="text-base font-normal text-gray-500 ml-1">/h</span></p>
                        <p className="text-xs text-gray-600 mt-1.5">
                          순 ARPU {fmtKRW(Math.round(metrics.netArpu))} ÷ 월 소모 {timePerStudent.toFixed(1)}h
                          <span className="ml-2 text-gray-700">(월평균 {avgLessonsPerMonth.toFixed(1)}회 × {stNum}h)</span>
                        </p>
                      </>
                    ) : (
                      <p className="text-sm text-gray-600">계산 불가 — 예약 데이터 또는 순 ARPU 필요</p>
                    )}
                  </div>

                  {/* 희망/최대 가동 비교 */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-gray-800 rounded-xl p-4 border border-cyan-500/15">
                      <p className="text-xs font-semibold text-cyan-400 mb-3 flex items-center gap-1.5">
                        <TrendingUp size={11} />희망 가동
                      </p>
                      <p className="text-xs text-gray-500 mb-0.5">투입 시간</p>
                      <p className="text-sm font-bold text-white mb-3">{dhNum}시간 / 월</p>
                      <div className="space-y-2 border-t border-gray-700 pt-3">
                        <div className="flex items-baseline justify-between">
                          <span className="text-xs text-gray-500">수용 인원</span>
                          <span className="text-base font-bold text-cyan-400">
                            {desiredCapacity !== null ? `${desiredCapacity}명` : '—'}
                          </span>
                        </div>
                        <div className="flex items-baseline justify-between">
                          <span className="text-xs text-gray-500">예상 순수익</span>
                          <span className="text-sm font-semibold text-emerald-400">
                            {desiredCapacity !== null && desiredRevenue > 0 ? fmtKRW(Math.round(desiredRevenue)) : '—'}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="bg-gray-800 rounded-xl p-4 border border-amber-500/15">
                      <p className="text-xs font-semibold text-amber-400 mb-3 flex items-center gap-1.5">
                        <TrendingUp size={11} />최대 가동
                      </p>
                      <p className="text-xs text-gray-500 mb-0.5">투입 시간</p>
                      <p className="text-sm font-bold text-white mb-3">{mhNum}시간 / 월</p>
                      <div className="space-y-2 border-t border-gray-700 pt-3">
                        <div className="flex items-baseline justify-between">
                          <span className="text-xs text-gray-500">수용 인원</span>
                          <span className="text-base font-bold text-amber-400">
                            {maxCapacity !== null ? `${maxCapacity}명` : '—'}
                          </span>
                        </div>
                        <div className="flex items-baseline justify-between">
                          <span className="text-xs text-gray-500">예상 순수익</span>
                          <span className="text-sm font-semibold text-emerald-400">
                            {maxCapacity !== null && maxRevenue > 0 ? fmtKRW(Math.round(maxRevenue)) : '—'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          );
        })()}

        {/* Student Profitability Table */}
        <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-800 flex items-center justify-between">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">학생별 수익성 분석</p>
            <span className="text-xs text-gray-700">{metrics.studentData.length}명</span>
          </div>
          {metrics.studentData.length === 0 ? (
            <div className="py-12 text-center text-gray-700 text-sm">선택 기간 내 재무 데이터 없음</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-800">
                    {['순위', '학생', '매출', '즉각 비용', '순기여', '레슨 수'].map(h => (
                      <th key={h} className={`px-4 py-3 text-xs font-medium text-gray-600 ${h === '순위' || h === '학생' ? 'text-left' : 'text-right'}`}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {metrics.studentData.map((s, i) => {
                    const rankColor = i === 0 ? 'text-amber-400' : i === 1 ? 'text-gray-400' : i === 2 ? 'text-amber-700' : 'text-gray-700';
                    return (
                      <tr key={s.id} className="border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors">
                        <td className="px-4 py-3.5"><span className={`text-xs font-bold ${rankColor}`}>#{i + 1}</span></td>
                        <td className="px-4 py-3.5 font-medium text-white">{s.name}</td>
                        <td className="px-4 py-3.5 text-right text-cyan-400">{s.revenue > 0 ? fmtKRW(s.revenue) : <span className="text-gray-700">—</span>}</td>
                        <td className="px-4 py-3.5 text-right text-red-400">{s.cost > 0 ? `−${fmtKRW(s.cost)}` : <span className="text-gray-700">—</span>}</td>
                        <td className="px-4 py-3.5 text-right font-semibold">
                          <span className={s.net >= 0 ? 'text-emerald-400' : 'text-red-400'}>
                            {s.net >= 0 ? fmtKRW(s.net) : `−${fmtKRW(Math.abs(s.net))}`}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-right text-gray-500">{s.lessons > 0 ? `${s.lessons}회` : <span className="text-gray-700">—</span>}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Ledger / Rollback panel */}
        <LedgerPanel allEvents={allEvents} onRollback={handleRollback} />

      </div>
      )} {/* end loading ternary */}
    </div>
  );
}
