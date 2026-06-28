import React, { useState, useEffect, useCallback } from 'react';
import { CalendarClock, Plus, Trash2, RefreshCw, ChevronLeft, ChevronRight, LayoutTemplate, RotateCcw, ChevronDown, ChevronUp, XCircle, Copy, ClipboardPaste } from 'lucide-react';
import { supabase, type TimeSlot, type WeeklyTemplate } from '../../lib/supabase';
import { sendStudentWebhook } from '../../lib/discord';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';

function localDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number) {
  return new Date(year, month, 1).getDay();
}

const DAY_NAMES = ['일', '월', '화', '수', '목', '금', '토'];

export function TimeSlotEditor() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const maxDate = new Date(today);
  maxDate.setDate(today.getDate() + 90);
  const maxDateStr = localDateStr(maxDate);
  const maxYear = maxDate.getFullYear();
  const maxMonth = maxDate.getMonth();

  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [loading, setLoading] = useState(false);
  const [slotBookers, setSlotBookers] = useState<Record<string, string>>({});
  const [cancelLoading, setCancelLoading] = useState<string | null>(null);
  const [newStart, setNewStart] = useState('10:00');
  const [newEnd, setNewEnd] = useState('11:00');
  const [addLoading, setAddLoading] = useState(false);
  const [allSlots, setAllSlots] = useState<Record<string, number>>({});
  const [bookedSlots, setBookedSlots] = useState<Record<string, { time: string; name: string }[]>>({});

  const [templates, setTemplates] = useState<Record<number, WeeklyTemplate[]>>({});
  const [showTemplates, setShowTemplates] = useState(false);
  const [tmplDay, setTmplDay] = useState(1);
  const [tmplStart, setTmplStart] = useState('10:00');
  const [tmplEnd, setTmplEnd] = useState('11:00');
  const [tmplLoading, setTmplLoading] = useState(false);
  const [syncLoading, setSyncLoading] = useState(false);
  const [tmplInterval, setTmplInterval] = useState('60');
  const [tmplCustomMin, setTmplCustomMin] = useState(30);
  const [tmplBuffer, setTmplBuffer] = useState(0);
  const [editingTmplId, setEditingTmplId] = useState<string | null>(null);
  const [copiedDow, setCopiedDow] = useState<number | null>(null);
  const [editStart, setEditStart] = useState('');
  const [editEnd, setEditEnd] = useState('');

  const loadMonthSlots = useCallback(async () => {
    const startDate = `${year}-${String(month + 1).padStart(2, '0')}-01`;
    const endDate = `${year}-${String(month + 1).padStart(2, '0')}-${getDaysInMonth(year, month)}`;

    const [slotsRes, bookedRes] = await Promise.all([
      supabase.from('time_slots').select('slot_date').gte('slot_date', startDate).lte('slot_date', endDate),
      supabase.from('time_slots')
        .select('slot_date, start_time, booked_by')
        .eq('is_available', false)
        .gte('slot_date', startDate)
        .lte('slot_date', endDate)
        .not('booked_by', 'is', null)
        .order('start_time'),
    ]);

    const counts: Record<string, number> = {};
    (slotsRes.data || []).forEach(s => {
      counts[s.slot_date] = (counts[s.slot_date] || 0) + 1;
    });
    setAllSlots(counts);

    const rawBooked = (bookedRes.data || []) as { slot_date: string; start_time: string; booked_by: string }[];
    const userIds = [...new Set(rawBooked.map(s => s.booked_by))];
    let profileMap: Record<string, string> = {};
    if (userIds.length > 0) {
      const { data: profilesData } = await supabase.from('profiles').select('id, full_name').in('id', userIds);
      (profilesData || []).forEach((p: any) => { profileMap[p.id] = p.full_name; });
    }
    const booked: Record<string, { time: string; name: string }[]> = {};
    rawBooked.forEach(s => {
      if (!booked[s.slot_date]) booked[s.slot_date] = [];
      booked[s.slot_date].push({ time: s.start_time.slice(0, 5), name: profileMap[s.booked_by] || '—' });
    });
    setBookedSlots(booked);
  }, [year, month]);

  const loadSlots = useCallback(async () => {
    if (!selectedDate) return;
    setLoading(true);
    const { data } = await supabase.from('time_slots').select('*').eq('slot_date', selectedDate).order('start_time');
    const loadedSlots = data || [];
    setSlots(loadedSlots);

    const bookedOnes = loadedSlots.filter(s => !s.is_available && s.booked_by);
    if (bookedOnes.length > 0) {
      const ids = bookedOnes.map(s => s.booked_by!);
      const { data: profilesData } = await supabase.from('profiles').select('id, full_name').in('id', ids);
      const profileMap: Record<string, string> = {};
      (profilesData || []).forEach((p: any) => { profileMap[p.id] = p.full_name; });
      const slotMap: Record<string, string> = {};
      bookedOnes.forEach(s => { slotMap[s.id] = profileMap[s.booked_by!] || '—'; });
      setSlotBookers(slotMap);
    } else {
      setSlotBookers({});
    }
    setLoading(false);
  }, [selectedDate]);

  useEffect(() => { loadMonthSlots(); }, [loadMonthSlots]);
  useEffect(() => { loadSlots(); }, [loadSlots]);

  const loadTemplates = useCallback(async () => {
    const { data } = await supabase.from('weekly_templates').select('*').order('day_of_week').order('start_time');
    const map: Record<number, WeeklyTemplate[]> = {};
    for (let i = 0; i < 7; i++) map[i] = [];
    (data || []).forEach((t: WeeklyTemplate) => { map[t.day_of_week].push(t); });
    setTemplates(map);
  }, []);

  useEffect(() => { loadTemplates(); }, [loadTemplates]);

  async function handleAddTemplate() {
    setTmplLoading(true);
    const toInsert: { day_of_week: number; start_time: string; end_time: string }[] = [];

    if (tmplInterval === 'none') {
      toInsert.push({ day_of_week: tmplDay, start_time: tmplStart, end_time: tmplEnd });
    } else {
      const intervalMin = tmplInterval === 'custom' ? tmplCustomMin : parseInt(tmplInterval, 10);
      const stepMin = intervalMin + tmplBuffer;
      const [sh, sm] = tmplStart.split(':').map(Number);
      const [eh, em] = tmplEnd.split(':').map(Number);
      const startMin = sh * 60 + sm;
      const endMin = eh * 60 + em;
      let cur = startMin;
      while (cur + intervalMin <= endMin) {
        const fmt = (m: number) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
        toInsert.push({ day_of_week: tmplDay, start_time: fmt(cur), end_time: fmt(cur + intervalMin) });
        cur += stepMin;
      }
    }

    if (toInsert.length > 0) {
      await supabase.from('weekly_templates').insert(toInsert);
    }
    await loadTemplates();
    setTmplLoading(false);
  }

  async function handleDeleteTemplate(id: string) {
    await supabase.from('weekly_templates').delete().eq('id', id);
    if (editingTmplId === id) setEditingTmplId(null);
    await loadTemplates();
  }

  async function handlePasteTo(targetDow: number) {
    if (copiedDow === null) return;
    const source = templates[copiedDow] || [];
    if (source.length === 0) return;
    const toInsert = source.map(t => ({ day_of_week: targetDow, start_time: t.start_time, end_time: t.end_time }));
    await supabase.from('weekly_templates').insert(toInsert);
    await loadTemplates();
  }

  async function handleUpdateTemplate() {
    if (!editingTmplId || !editStart || !editEnd) return;
    await supabase.from('weekly_templates').update({ start_time: editStart, end_time: editEnd }).eq('id', editingTmplId);
    setEditingTmplId(null);
    await loadTemplates();
  }

  function startEditTemplate(t: WeeklyTemplate) {
    setEditingTmplId(t.id);
    setEditStart(t.start_time.slice(0, 5));
    setEditEnd(t.end_time.slice(0, 5));
  }

  async function handleSync() {
    setSyncLoading(true);
    const todayStr = localDateStr(today);

    await supabase
      .from('time_slots')
      .delete()
      .gte('slot_date', todayStr)
      .lte('slot_date', maxDateStr)
      .eq('is_available', true)
      .eq('is_customized', false);

    const { data: allTmpl } = await supabase.from('weekly_templates').select('*');
    const toInsert: object[] = [];
    const cursor = new Date(today);
    while (cursor <= maxDate) {
      const dow = cursor.getDay();
      const dateStr = localDateStr(cursor);
      (allTmpl || [])
        .filter((t: any) => t.day_of_week === dow)
        .forEach((t: any) => {
          toInsert.push({ slot_date: dateStr, start_time: t.start_time, end_time: t.end_time, is_available: true, is_customized: false });
        });
      cursor.setDate(cursor.getDate() + 1);
    }
    for (let i = 0; i < toInsert.length; i += 100) {
      await supabase.from('time_slots').insert(toInsert.slice(i, i + 100));
    }
    await loadMonthSlots();
    if (selectedDate) await loadSlots();
    setSyncLoading(false);
  }

  async function handleAdd() {
    if (!selectedDate || !newStart || !newEnd) return;
    setAddLoading(true);
    await supabase.from('time_slots').insert({
      slot_date: selectedDate,
      start_time: newStart,
      end_time: newEnd,
      is_available: true,
      is_customized: true,
    });
    await loadSlots();
    await loadMonthSlots();
    setAddLoading(false);
  }

  async function handleDelete(slotId: string) {
    await supabase.from('time_slots').delete().eq('id', slotId);
    await loadSlots();
    await loadMonthSlots();
  }

  async function handleCancelBooking(slot: TimeSlot) {
    if (!slot.booked_by) return;
    setCancelLoading(slot.id);

    const { data: profile } = await supabase
      .from('profiles').select('tickets').eq('id', slot.booked_by).single();

    if (!profile) { setCancelLoading(null); return; }

    const { error: slotError } = await supabase
      .from('time_slots')
      .update({ is_available: true, booked_by: null })
      .eq('id', slot.id);

    if (!slotError) {
      await supabase
        .from('profiles')
        .update({ tickets: (profile.tickets ?? 0) + 1 })
        .eq('id', slot.booked_by);
      await supabase
        .from('reservations')
        .update({ status: 'cancelled', cancelled_at: new Date().toISOString() })
        .eq('slot_id', slot.id)
        .eq('status', 'confirmed');

      console.log('[WEBHOOK_STEP1] WEBHOOK_TRIGGER', 'booking_cancelled_by_admin', slot.booked_by);
      await sendStudentWebhook(slot.booked_by, 'booking_cancelled_by_admin', {
        date: slot.slot_date,
        time: `${slot.start_time.slice(0, 5)}–${slot.end_time.slice(0, 5)}`,
      });
    }

    await loadSlots();
    await loadMonthSlots();
    setCancelLoading(null);
  }

  function prevMonth() {
    if (month === 0) { setYear(y => y - 1); setMonth(11); } else setMonth(m => m - 1);
  }
  function nextMonth() {
    if (year > maxYear || (year === maxYear && month >= maxMonth)) return;
    if (month === 11) { setYear(y => y + 1); setMonth(0); } else setMonth(m => m + 1);
  }
  const canGoNext = !(year > maxYear || (year === maxYear && month >= maxMonth));

  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);
  const monthName = new Date(year, month, 1).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long' });

  return (
    <div className="space-y-5">
      {/* Weekly Template Panel */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <button
          onClick={() => setShowTemplates(v => !v)}
          className="w-full px-5 py-4 flex items-center justify-between hover:bg-slate-50 transition-colors"
        >
          <div className="flex items-center gap-2">
            <LayoutTemplate size={16} className="text-slate-500" />
            <span className="font-semibold text-slate-900">요일별 기본 시간표 설정</span>
          </div>
          {showTemplates ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
        </button>

        {showTemplates && (
          <div className="px-5 pb-5 space-y-4 border-t border-slate-100 pt-4">
            {/* Add template entry */}
            <div className="flex items-end gap-2 flex-wrap">
              <div>
                <label className="text-xs font-medium text-slate-600 block mb-1">요일</label>
                <select
                  value={tmplDay}
                  onChange={e => setTmplDay(Number(e.target.value))}
                  className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-300"
                >
                  {DAY_NAMES.map((d, i) => <option key={i} value={i}>{d}요일</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600 block mb-1">시작</label>
                <input type="time" value={tmplStart} onChange={e => setTmplStart(e.target.value)}
                  className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-300" />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600 block mb-1">종료</label>
                <input type="time" value={tmplEnd} onChange={e => setTmplEnd(e.target.value)}
                  className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-300" />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600 block mb-1">분할 단위</label>
                <select value={tmplInterval} onChange={e => setTmplInterval(e.target.value)}
                  className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-300">
                  <option value="60">60분</option>
                  <option value="90">90분</option>
                  <option value="120">120분</option>
                  <option value="none">분할 없음</option>
                  <option value="custom">커스텀</option>
                </select>
              </div>
              {tmplInterval === 'custom' && (
                <div>
                  <label className="text-xs font-medium text-slate-600 block mb-1">분(min)</label>
                  <input type="number" min={5} max={480} value={tmplCustomMin} onChange={e => setTmplCustomMin(Number(e.target.value))}
                    className="w-20 px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-300" />
                </div>
              )}
              <div>
                <label className="text-xs font-medium text-slate-600 block mb-1">여유시간(분)</label>
                <input
                  type="number" min={0} max={120} value={tmplBuffer}
                  onChange={e => setTmplBuffer(Number(e.target.value))}
                  className="w-20 px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-300"
                  placeholder="0"
                />
              </div>
              <Button size="sm" variant="secondary" loading={tmplLoading} disabled={!tmplStart || !tmplEnd || tmplStart >= tmplEnd} onClick={handleAddTemplate}>
                <Plus size={13} />추가
              </Button>
            </div>

            {/* Template list by day */}
            <div className="grid grid-cols-7 gap-2">
              {DAY_NAMES.map((d, dow) => (
                <div key={dow} className="space-y-1">
                  <div className="flex items-center justify-center gap-1 mb-0.5">
                    <p className="text-xs font-medium text-slate-500">{d}</p>
                    <button
                      title={`${d}요일 복사`}
                      onClick={() => setCopiedDow(copiedDow === dow ? null : dow)}
                      className={`rounded p-0.5 transition-colors ${copiedDow === dow ? 'text-blue-500 bg-blue-50' : 'text-slate-300 hover:text-slate-500'}`}
                    >
                      <Copy size={10} />
                    </button>
                    {copiedDow !== null && copiedDow !== dow && (
                      <button
                        title={`${DAY_NAMES[copiedDow]}요일 → ${d}요일 붙여넣기`}
                        onClick={() => handlePasteTo(dow)}
                        className="rounded p-0.5 text-emerald-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors"
                      >
                        <ClipboardPaste size={10} />
                      </button>
                    )}
                  </div>
                  {(templates[dow] || []).length === 0 ? (
                    <p className="text-xs text-slate-300 text-center">—</p>
                  ) : (
                    (templates[dow] || []).map(t => (
                      <div
                        key={t.id}
                        onClick={() => startEditTemplate(t)}
                        className={`flex items-center gap-1 rounded-lg px-1.5 py-1 cursor-pointer transition-colors
                          ${editingTmplId === t.id ? 'bg-amber-100 ring-1 ring-amber-300' : 'bg-slate-50 hover:bg-slate-100'}`}
                      >
                        <span className="text-xs text-slate-700 flex-1 leading-none">
                          {t.start_time.slice(0,5)}<br/>
                          <span className="text-slate-400">~{t.end_time.slice(0,5)}</span>
                        </span>
                        <button
                          onClick={e => { e.stopPropagation(); handleDeleteTemplate(t.id); }}
                          className="text-red-400 hover:text-red-600 shrink-0"
                        >
                          <Trash2 size={11} />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              ))}
            </div>

            {/* Sync button */}
            {editingTmplId && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-end gap-2 flex-wrap">
                <p className="text-xs font-semibold text-amber-700 w-full">슬롯 시간 수정</p>
                <div>
                  <label className="text-xs text-slate-600 block mb-1">시작</label>
                  <input type="time" value={editStart} onChange={e => setEditStart(e.target.value)}
                    className="px-2 py-1.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-amber-400" />
                </div>
                <div>
                  <label className="text-xs text-slate-600 block mb-1">종료</label>
                  <input type="time" value={editEnd} onChange={e => setEditEnd(e.target.value)}
                    className="px-2 py-1.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-amber-400" />
                </div>
                <Button size="sm" onClick={handleUpdateTemplate}>저장</Button>
                <Button size="sm" variant="ghost" onClick={() => setEditingTmplId(null)}>취소</Button>
              </div>
            )}

            {/* Sync button */}
            <div className="flex items-center gap-3 pt-1 border-t border-slate-100">
              <Button loading={syncLoading} onClick={handleSync} className="gap-2">
                <RotateCcw size={14} />
                90일 동기화 실행
              </Button>
              <p className="text-xs text-slate-400">오늘~90일 미예약/비커스텀 슬롯을 템플릿 기반으로 재생성합니다.</p>
            </div>
          </div>
        )}
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
        <div className="flex items-center justify-between mb-4">
          <button onClick={prevMonth} className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
            <ChevronLeft size={18} className="text-slate-600" />
          </button>
          <h3 className="font-semibold text-slate-900">{monthName}</h3>
          <button onClick={nextMonth} disabled={!canGoNext} className="p-2 hover:bg-slate-100 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed">
            <ChevronRight size={18} className="text-slate-600" />
          </button>
        </div>

        <div className="grid grid-cols-7 gap-1 mb-2">
          {['일','월','화','수','목','금','토'].map(d => (
            <div key={d} className="text-center text-xs font-medium text-slate-400 py-1">{d}</div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: firstDay }).map((_, i) => <div key={`e${i}`} className="h-20" />)}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day = i + 1;
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const isSelected = dateStr === selectedDate;
            const isToday = dateStr === localDateStr(today);
            const hasSlots = allSlots[dateStr] > 0;
            const isAfterMax = dateStr > maxDateStr;
            const dayBooked = bookedSlots[dateStr] || [];
            const visibleBooked = dayBooked.slice(0, 2);
            const extraCount = dayBooked.length - visibleBooked.length;

            return (
              <button
                key={day}
                onClick={() => !isAfterMax && setSelectedDate(isSelected ? null : dateStr)}
                disabled={isAfterMax}
                className={`h-20 w-full rounded-xl text-sm font-medium transition-all duration-150 flex flex-col items-start p-1.5 relative overflow-hidden
                  ${isAfterMax ? 'text-slate-300 cursor-not-allowed' : isSelected ? 'bg-slate-800 text-white' : isToday ? 'bg-amber-50 ring-1 ring-amber-300 hover:bg-amber-100 text-slate-700 cursor-pointer' : 'hover:bg-slate-100 text-slate-700 cursor-pointer'}
                `}
              >
                <span className={`text-xs font-semibold mb-0.5 ml-0.5 ${isAfterMax ? 'text-slate-300' : isSelected ? 'text-white' : isToday ? 'text-amber-700' : 'text-slate-800'}`}>
                  {day}
                </span>
                {visibleBooked.map((b, idx) => (
                  <span
                    key={idx}
                    className={`w-full text-left leading-tight px-1 py-0.5 rounded mb-0.5 truncate block
                      ${isSelected ? 'bg-white/20 text-white' : 'bg-sky-50 text-sky-700'}`}
                    style={{ fontSize: '10px' }}
                  >
                    {b.time} {b.name}
                  </span>
                ))}
                {extraCount > 0 && (
                  <span
                    className={`text-left px-1 leading-none ${isSelected ? 'text-white/60' : 'text-slate-400'}`}
                    style={{ fontSize: '10px' }}
                  >
                    외 {extraCount}건
                  </span>
                )}
                {hasSlots && dayBooked.length === 0 && (
                  <span className={`absolute bottom-1 right-1 w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-amber-400' : 'bg-emerald-500'}`} />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {selectedDate && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-slate-900 flex items-center gap-2">
              <CalendarClock size={16} className="text-slate-500" />
              {selectedDate} 슬롯 관리
            </h3>
            <Button size="sm" variant="ghost" onClick={loadSlots}><RefreshCw size={14} /></Button>
          </div>

          {/* Add new slot */}
          <div className="flex items-end gap-3 mb-4 p-3 bg-slate-50 rounded-xl">
            <div className="flex-1">
              <label className="text-xs font-medium text-slate-600 block mb-1">시작 시간</label>
              <input
                type="time"
                value={newStart}
                onChange={(e) => setNewStart(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
              />
            </div>
            <div className="flex-1">
              <label className="text-xs font-medium text-slate-600 block mb-1">종료 시간</label>
              <input
                type="time"
                value={newEnd}
                onChange={(e) => setNewEnd(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
              />
            </div>
            <Button size="sm" variant="success" loading={addLoading} onClick={handleAdd}>
              <Plus size={14} />
              추가
            </Button>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-6 text-slate-400">
              <RefreshCw size={16} className="animate-spin mr-2" />
              불러오는 중...
            </div>
          ) : slots.length === 0 ? (
            <p className="text-slate-400 text-sm text-center py-4">등록된 슬롯이 없습니다.</p>
          ) : (
            <div className="space-y-2">
              {slots.map((slot) => (
                <div key={slot.id} className="flex items-center justify-between p-3 border border-slate-200 rounded-xl">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-sm font-medium text-slate-900 shrink-0">
                      {slot.start_time.slice(0,5)} – {slot.end_time.slice(0,5)}
                    </span>
                    <Badge variant={slot.is_available ? 'success' : 'danger'}>
                      {slot.is_available ? '예약 가능' : '예약됨'}
                    </Badge>
                    {!slot.is_available && slotBookers[slot.id] && (
                      <span className="text-xs text-slate-500 truncate">({slotBookers[slot.id]})</span>
                    )}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {!slot.is_available && slot.booked_by && (
                      <button
                        onClick={() => handleCancelBooking(slot)}
                        disabled={cancelLoading === slot.id}
                        className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-amber-700 bg-amber-50 hover:bg-amber-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        title="예약 취소 및 티켓 반환"
                      >
                        {cancelLoading === slot.id
                          ? <RefreshCw size={12} className="animate-spin" />
                          : <XCircle size={12} />}
                        예약 취소
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(slot.id)}
                      disabled={!slot.is_available}
                      className="p-1.5 hover:bg-red-50 rounded-lg transition-colors text-red-400 disabled:opacity-30 disabled:cursor-not-allowed"
                      title={slot.is_available ? '삭제' : '예약된 슬롯은 삭제 불가'}
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
