import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Users, CheckCircle, XCircle, Trash2, Clock,
  RefreshCw, AlertCircle, Search, FileText, Save, Pencil, ClipboardList, Bell, Gamepad2, Package, TrendingUp
} from 'lucide-react';
import { supabase, type Profile, type LessonApplication, type Product } from '../../lib/supabase';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Modal } from '../ui/Modal';
import { StudentInventoryManager } from './StudentInventoryManager';

function parseGender(experience: string): string {
  const m = experience?.match(/^\[성별:\s*([^\]]+)\]/);
  return m ? m[1] : '—';
}

function parseExperienceText(experience: string): string {
  return experience?.replace(/^\[성별:\s*[^\]]+\]\s*/, '') ?? '';
}

function parseQuestions(questions: string): { genre: string; referrer: string; extra: string } {
  const genreMatch = questions?.match(/\[장르\/레퍼런스\]\s*(.*?)(?:\n|$)/);
  const referrerMatch = questions?.match(/\[추천인\]\s*(.*?)(?:\n|$)/);
  const extraMatch = questions?.match(/\[전달할 말\]\s*([\s\S]*)/);
  return {
    genre: genreMatch ? genreMatch[1].trim() : (questions ?? ''),
    referrer: referrerMatch ? referrerMatch[1].trim() : '',
    extra: extraMatch ? extraMatch[1].trim() : '',
  };
}

interface AppDetailContentProps {
  app: LessonApplication;
  showMemo: boolean;
  memoValue: string;
  memoSaving: boolean;
  onMemoChange: (v: string) => void;
  onMemoSave: () => void;
}

function AppDetailContent({ app, showMemo, memoValue, memoSaving, onMemoChange, onMemoSave }: AppDetailContentProps) {
  const gender = parseGender(app.experience);
  const expText = parseExperienceText(app.experience);
  const { genre, referrer, extra } = parseQuestions(app.questions || '');
  return (
    <div className="space-y-3 text-sm">
      <div className="grid grid-cols-3 gap-2">
        <div className="bg-slate-50 rounded-xl p-3">
          <p className="text-xs text-slate-500 mb-0.5">나이</p>
          <p className="font-medium text-slate-900">{app.age || '—'}</p>
        </div>
        <div className="bg-slate-50 rounded-xl p-3">
          <p className="text-xs text-slate-500 mb-0.5">성별</p>
          <p className="font-medium text-slate-900">{gender}</p>
        </div>
        <div className="bg-slate-50 rounded-xl p-3">
          <p className="text-xs text-slate-500 mb-0.5">수업 방식</p>
          <p className="font-medium text-slate-900">{app.preferred_schedule || '—'}</p>
        </div>
      </div>
      <div className="bg-slate-50 rounded-xl p-3">
        <p className="text-xs text-slate-500 mb-1">연락처</p>
        <p className="text-slate-800">{app.phone || '—'}</p>
      </div>
      <div className="bg-slate-50 rounded-xl p-3">
        <p className="text-xs text-slate-500 mb-1">음악 배경 및 경험</p>
        <p className="text-slate-800 leading-relaxed whitespace-pre-wrap">{expText || '—'}</p>
      </div>
      <div className="bg-slate-50 rounded-xl p-3">
        <p className="text-xs text-slate-500 mb-1">레슨 목적</p>
        <p className="text-slate-800 leading-relaxed">{app.goals || '—'}</p>
      </div>
      <div className="bg-slate-50 rounded-xl p-3">
        <p className="text-xs text-slate-500 mb-1">장르 / 레퍼런스</p>
        <p className="text-slate-800">{genre || '—'}</p>
      </div>
      {referrer && (
        <div className="bg-slate-50 rounded-xl p-3">
          <p className="text-xs text-slate-500 mb-1">추천인</p>
          <p className="text-slate-800">{referrer}</p>
        </div>
      )}
      {extra && (
        <div className="bg-slate-50 rounded-xl p-3">
          <p className="text-xs text-slate-500 mb-1">전달할 말</p>
          <p className="text-slate-800 leading-relaxed whitespace-pre-wrap">{extra}</p>
        </div>
      )}
      {showMemo && (
        <div>
          <label className="text-xs font-medium text-slate-600 flex items-center gap-1 mb-1.5">
            <FileText size={12} /> 메모
          </label>
          <textarea
            value={memoValue}
            onChange={e => onMemoChange(e.target.value)}
            rows={3}
            placeholder="관리자 메모를 입력하세요..."
            className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-slate-400 resize-none"
          />
          <div className="flex justify-end mt-2">
            <Button size="sm" variant="primary" loading={memoSaving} onClick={onMemoSave}>
              <Save size={13} />
              저장
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

interface StudentEditFormProps {
  student: Profile;
  onSave: (updates: Record<string, unknown>) => Promise<void>;
  onOpenStudioLevels: (student: Profile) => void;
  saving: boolean;
}

function StudentEditForm({ student, onSave, onOpenStudioLevels, saving }: StudentEditFormProps) {
  const [form, setForm] = useState({
    full_name: student.full_name,
    phone: student.phone,
    password: '',
    tickets: student.tickets,
    expiry_date: student.expiry_date ? student.expiry_date.slice(0, 10) : '',
    payment_amount: student.payment_amount,
    unit_price: student.unit_price,
    discord_webhook: student.discord_webhook ?? '',
  });

  function set(k: string, v: unknown) { setForm(f => ({ ...f, [k]: v })); }

  async function handleSubmit() {
    const updates: Record<string, unknown> = {
      full_name: form.full_name,
      phone: form.phone.replace(/[\s\-]/g, ''),
      tickets: Number(form.tickets),
      expiry_date: form.expiry_date ? new Date(form.expiry_date).toISOString() : null,
      payment_amount: Number(form.payment_amount),
      unit_price: Number(form.unit_price),
      discord_webhook: form.discord_webhook.trim() || null,
    };
    if (form.password) updates.password = form.password;
    await onSave(updates);
  }

  const inputCls = 'w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-slate-400';

  return (
    <div className="space-y-3 text-sm">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-medium text-slate-600 block mb-1">이름</label>
          <input type="text" value={form.full_name} onChange={e => set('full_name', e.target.value)} className={inputCls} />
        </div>
        <div>
          <label className="text-xs font-medium text-slate-600 block mb-1">전화번호</label>
          <input type="tel" value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="010-0000-0000" className={inputCls} />
        </div>
      </div>
      <div>
        <label className="text-xs font-medium text-slate-600 block mb-1">비밀번호 변경</label>
        <input type="text" value={form.password} onChange={e => set('password', e.target.value)} placeholder="빈칸이면 변경 안함" className={inputCls} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-medium text-slate-600 block mb-1">티켓 수</label>
          <input type="number" value={form.tickets} onChange={e => set('tickets', e.target.value)} className={inputCls} />
        </div>
        <div>
          <label className="text-xs font-medium text-slate-600 block mb-1">만료일</label>
          <input type="date" value={form.expiry_date} onChange={e => set('expiry_date', e.target.value)} className={inputCls} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-medium text-slate-600 block mb-1">결제 금액</label>
          <input type="number" step="10000" value={form.payment_amount} onChange={e => set('payment_amount', e.target.value)} className={inputCls} />
        </div>
        <div>
          <label className="text-xs font-medium text-slate-600 block mb-1">단가</label>
          <input type="number" step="10000" value={form.unit_price} onChange={e => set('unit_price', e.target.value)} className={inputCls} />
        </div>
      </div>
      <div className="border-t border-slate-100 pt-3">
        <label className="text-xs font-medium text-slate-600 flex items-center gap-1.5 mb-1">
          <Bell size={12} className="text-indigo-400" />
          Discord Webhook URL
        </label>
        <input
          type="url"
          value={form.discord_webhook}
          onChange={e => set('discord_webhook', e.target.value)}
          placeholder="https://discord.com/api/webhooks/..."
          className={inputCls}
        />
        <p className="text-xs text-slate-400 mt-1">학생 알림 전송에 사용됩니다. 비워두면 알림이 발송되지 않습니다.</p>
      </div>

      <div className="border-t border-slate-100 pt-4 pb-1">
        <label className="text-xs font-medium text-slate-600 block mb-2">작업실 관리</label>
        <div className="flex gap-2 w-full">
          
          {/* 좌측: 부모의 억지 CSS 오버라이드를 삭제하고 순수 컨테이너만 제공 */}
          <div className="flex-1 flex">
            <StudentInventoryManager studentId={student.id} />
          </div>
          
          {/* 우측: 아이콘 추가 및 좌측과 완벽히 동일한 CSS 클래스 적용 */}
          <button
            type="button"
            onClick={() => onOpenStudioLevels(student)}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-white border border-slate-200 text-slate-700 rounded-xl text-xs font-medium hover:bg-slate-50 hover:border-slate-300 transition-all shadow-sm"
          >
            <TrendingUp size={14} className="text-slate-500" />
            작업실 레벨 관리
          </button>
          
        </div>
      </div>

      <div className="flex justify-end pt-3">
        <Button variant="primary" loading={saving} onClick={handleSubmit}>
          <Save size={13} />
          저장
        </Button>
      </div>
    </div>
  );
}

interface GamePointLog {
  id: string;
  game_id: string;
  sub_key: string | null;
  points: number;
  awarded_at: string;
}

function ActivityTab({ userId }: { userId: string }) {
  const [logs, setLogs] = useState<GamePointLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    supabase
      .from('game_point_logs')
      .select('id, game_id, sub_key, points, awarded_at')
      .eq('user_id', userId)
      .order('awarded_at', { ascending: false })
      .limit(100)
      .then(({ data }) => {
        if (!cancelled) {
          setLogs(data ?? []);
          setLoading(false);
        }
      });
    return () => { cancelled = true; };
  }, [userId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-10 text-slate-400 text-sm">
        <RefreshCw size={16} className="animate-spin mr-2" />로딩 중...
      </div>
    );
  }

  const now = Date.now();
  const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;
  const totalClear = logs.length;
  const recentClear = logs.filter(l => new Date(l.awarded_at).getTime() >= sevenDaysAgo).length;
  const recent5 = logs.slice(0, 5);

  const GAME_NAME: Record<string, string> = {
    'bass-game': '그루브 매처',
    'drum-game': '리듬 마스터',
    'ear-training': '청음 트레이닝',
    'piano-game': '신스 하모니',
    'quiz': '커리큘럼 퀴즈',
    'shortcut': 'DAW 단축키',
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-slate-50 rounded-xl p-4 text-center">
          <p className="text-xs text-slate-500 mb-1">총 클리어 횟수</p>
          <p className="text-2xl font-bold text-slate-900">{totalClear}<span className="text-sm font-normal text-slate-500 ml-1">회</span></p>
        </div>
        <div className="bg-slate-50 rounded-xl p-4 text-center">
          <p className="text-xs text-slate-500 mb-1">최근 7일</p>
          <p className="text-2xl font-bold text-slate-900">{recentClear}<span className="text-sm font-normal text-slate-500 ml-1">회</span></p>
        </div>
      </div>

      <div>
        <p className="text-xs font-semibold text-slate-600 mb-2">최근 5건</p>
        {recent5.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-4">챌린지 기록이 없습니다.</p>
        ) : (
          <div className="space-y-2">
            {recent5.map(log => (
              <div key={log.id} className="flex items-center justify-between bg-slate-50 rounded-xl px-4 py-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-800 truncate">
                    {GAME_NAME[log.game_id] ?? log.game_id}
                    {log.sub_key && <span className="text-xs text-slate-400 ml-1">· {log.sub_key}</span>}
                  </p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {new Date(log.awarded_at).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
                <span className="text-sm font-bold text-emerald-600 shrink-0 ml-3">+{log.points}점</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

type DetailTarget =
  | { type: 'app'; data: LessonApplication }
  | { type: 'student'; data: Profile; app: LessonApplication | null };

const ADMIN_ROOM_OPTIONS = [
  { id: 'room_lv1', level: 'LV.1', name: '옥탑 작업실' },
  { id: 'room_lv2', level: 'LV.2', name: '루키 스튜디오' },
  { id: 'room_lv3', level: 'LV.3', name: '시그니처 스튜디오' },
] as const;

export function StudentManager({ onAction }: { onAction?: () => void }) {
  const [applications, setApplications] = useState<LessonApplication[]>([]);
  const [students, setStudents] = useState<Profile[]>([]);
  const [approvedApps, setApprovedApps] = useState<Record<string, LessonApplication>>({});
  const [loading, setLoading] = useState(true);
  const hasLoadedRef = useRef(false);
  const [approveModal, setApproveModal] = useState<LessonApplication | null>(null);
  const [deleteModal, setDeleteModal] = useState<Profile | null>(null);
  const [detailModal, setDetailModal] = useState<DetailTarget | null>(null);
  const [studioLevelStudent, setStudioLevelStudent] = useState<Profile | null>(null);
  const [unlockingRoomId, setUnlockingRoomId] = useState<string | null>(null);
  const [studioLevelError, setStudioLevelError] = useState('');
  const [detailTab, setDetailTab] = useState<'app' | 'edit' | 'activity'>('app');
  const [memoValue, setMemoValue] = useState('');
  const [memoSaving, setMemoSaving] = useState(false);
  const [editSaving, setEditSaving] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [approveForm, setApproveForm] = useState({ tickets: 4, payment: 0, unit: 0, phone: '', password: '' });
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState('');
  const [filterGender, setFilterGender] = useState('');
  const [filterSchedule, setFilterSchedule] = useState('');
  const [sortKey, setSortKey] = useState('created_desc');
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  const showToast = (msg: string, ok: boolean) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3000);
  };

  const loadData = useCallback(async () => {
    if (!hasLoadedRef.current) setLoading(true);
    const [appRes, stuRes, approvedRes, prodRes] = await Promise.all([
      supabase.from('lesson_applications').select('*').eq('status', 'waiting').order('created_at', { ascending: false }),
      supabase.from('profiles').select('id, full_name, role, status, phone, tickets, points, unlocked_rooms, default_room_id, expiry_date, payment_amount, unit_price, memo, discord_webhook, created_at, updated_at').eq('role', 'student').order('created_at', { ascending: false }),
      supabase.from('lesson_applications').select('*').eq('status', 'approved'),
      supabase.from('products').select('*').order('sort_order').order('created_at'),
    ]);
    setApplications(appRes.data || []);
    setStudents(stuRes.data || []);
    setProducts(prodRes.data || []);
    const map: Record<string, LessonApplication> = {};
    for (const a of (approvedRes.data || [])) {
      if (a.user_id) map[a.user_id] = a;
    }
    setApprovedApps(map);
    setLoading(false);
    hasLoadedRef.current = true;
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  function openDetail(target: DetailTarget) {
    setDetailModal(target);
    setDetailTab('app');
    setMemoValue(target.type === 'app' ? (target.data.memo || '') : (target.data.memo || ''));
  }

  async function handleSaveStudentProfile(updates: Record<string, unknown>) {
    if (!detailModal || detailModal.type !== 'student') return;
    setEditSaving(true);
    const { error } = await supabase.from('profiles').update(updates).eq('id', detailModal.data.id);
    setEditSaving(false);
    if (error) { showToast('저장 실패: ' + error.message, false); return; }
    showToast('학생 정보가 저장되었습니다.', true);
    loadData();
  }

  async function handleSaveMemo() {
    if (!detailModal) return;
    setMemoSaving(true);
    if (detailModal.type === 'app') {
      await supabase.from('lesson_applications').update({ memo: memoValue }).eq('id', detailModal.data.id);
    } else {
      await supabase.from('profiles').update({ memo: memoValue }).eq('id', detailModal.data.id);
    }
    setMemoSaving(false);
    showToast('메모가 저장되었습니다.', true);
    loadData();
  }

  async function handleApprove() {
    if (!approveModal) return;
    if (!approveForm.phone || !approveForm.password) {
      showToast('전화번호와 임시 비밀번호를 입력하세요.', false);
      return;
    }
    setActionLoading(true);
    const newId = crypto.randomUUID();
    const cleanPhone = approveForm.phone.replace(/[\s\-]/g, '');
    const linkedProduct = products.find(p => p.id === approveModal.product_id);
    const durationDays = linkedProduct?.duration_days ?? 30;
    const { error: insertErr } = await supabase.from('profiles').insert({
      id: newId,
      full_name: approveModal.full_name,
      role: 'student',
      status: 'active',
      phone: cleanPhone,
      password: approveForm.password,
      tickets: approveForm.tickets,
      expiry_date: new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000).toISOString(),
      payment_amount: approveForm.payment,
      unit_price: approveForm.unit,
      points: 0,
    });
    if (insertErr) {
      showToast('계정 생성에 실패했습니다: ' + insertErr.message, false);
      setActionLoading(false);
      return;
    }
    await supabase.from('lesson_applications')
      .update({ status: 'approved', user_id: newId })
      .eq('id', approveModal.id);
    if (approveModal.product_id) {
      await supabase.from('registrations').insert({
        student_id: newId,
        product_id: approveModal.product_id,
        selected_options: [],
        total_price: approveForm.payment,
        status: 'approved',
      });
    }
    showToast('수강 승인이 완료되었습니다.', true);
    setApproveModal(null);
    loadData();
    onAction?.();
    setActionLoading(false);
  }

  async function handleDeleteStudent(student: Profile) {
    setActionLoading(true);
    const todayStr = new Date().toISOString().slice(0, 10);
    // 미래 예약 슬롯 상태 롤백 (Row 삭제 금지 — 상태만 초기화)
    await supabase
      .from('time_slots')
      .update({ is_available: true, booked_by: null })
      .eq('booked_by', student.id)
      .gte('slot_date', todayStr);
    await supabase.from('profiles').delete().eq('id', student.id);
    showToast(`${student.full_name} 학생이 삭제되었습니다.`, true);
    setDeleteModal(null);
    loadData();
    setActionLoading(false);
  }

  async function handleStatusToggle(student: Profile) {
    const newStatus = student.status === 'active' ? 'suspended' : 'active';
    await supabase.from('profiles').update({ status: newStatus }).eq('id', student.id);
    loadData();
  }

  function openStudioLevelModal(student: Profile) {
    setStudioLevelError('');
    setStudioLevelStudent(student);
  }

  async function handleUnlockRoom(roomId: string) {
    if (
      !studioLevelStudent
      || roomId === 'room_lv1'
      || !ADMIN_ROOM_OPTIONS.some(room => room.id === roomId)
    ) return;

    const currentRooms = Array.isArray(studioLevelStudent.unlocked_rooms)
      ? studioLevelStudent.unlocked_rooms
      : ['room_lv1'];
    if (currentRooms.includes(roomId)) return;

    const nextRooms = Array.from(new Set(['room_lv1', ...currentRooms, roomId]));
    setUnlockingRoomId(roomId);
    setStudioLevelError('');

    const { error } = await supabase
      .from('profiles')
      .update({ unlocked_rooms: nextRooms })
      .eq('id', studioLevelStudent.id);

    setUnlockingRoomId(null);

    if (error) {
      setStudioLevelError('작업실 공간을 해금하지 못했습니다. ' + error.message);
      return;
    }

    const updatedStudent = { ...studioLevelStudent, unlocked_rooms: nextRooms };
    setStudioLevelStudent(updatedStudent);
    setStudents(current => current.map(student =>
      student.id === updatedStudent.id ? updatedStudent : student
    ));
    setDetailModal(current => {
      if (!current || current.type !== 'student' || current.data.id !== updatedStudent.id) {
        return current;
      }
      return { ...current, data: updatedStudent };
    });
    showToast(`${updatedStudent.full_name} 학생의 ${roomId} 공간을 해금했습니다.`, true);
  }

  async function handleLockRoom(roomId: string) {
    if (
      !studioLevelStudent
      || roomId === 'room_lv1'
      || !ADMIN_ROOM_OPTIONS.some(room => room.id === roomId)
    ) return;

    const currentRooms = Array.isArray(studioLevelStudent.unlocked_rooms)
      ? studioLevelStudent.unlocked_rooms
      : ['room_lv1'];
    if (!currentRooms.includes(roomId)) return;

    const nextRooms = Array.from(new Set([
      'room_lv1',
      ...currentRooms.filter(currentRoomId => currentRoomId !== roomId),
    ]));
    const shouldResetDefaultRoom = studioLevelStudent.default_room_id === roomId;
    const profileUpdates: {
      unlocked_rooms: string[];
      default_room_id?: string;
    } = {
      unlocked_rooms: nextRooms,
    };

    if (shouldResetDefaultRoom) {
      profileUpdates.default_room_id = 'room_lv1';
    }

    setUnlockingRoomId(roomId);
    setStudioLevelError('');

    const { error } = await supabase
      .from('profiles')
      .update(profileUpdates)
      .eq('id', studioLevelStudent.id);

    setUnlockingRoomId(null);

    if (error) {
      setStudioLevelError('작업실 공간 해금을 취소하지 못했습니다. ' + error.message);
      return;
    }

    const updatedStudent: Profile = {
      ...studioLevelStudent,
      unlocked_rooms: nextRooms,
      ...(shouldResetDefaultRoom ? { default_room_id: 'room_lv1' } : {}),
    };
    setStudioLevelStudent(updatedStudent);
    setStudents(current => current.map(student =>
      student.id === updatedStudent.id ? updatedStudent : student
    ));
    setDetailModal(current => {
      if (!current || current.type !== 'student' || current.data.id !== updatedStudent.id) {
        return current;
      }
      return { ...current, data: updatedStudent };
    });
    showToast(`${updatedStudent.full_name} 학생의 ${roomId} 공간 해금을 취소했습니다.`, true);
  }

  const filteredStudents = students
    .filter(s => {
      if (search && !s.full_name.toLowerCase().includes(search.toLowerCase()) && !s.phone?.includes(search)) return false;
      const app = approvedApps[s.id];
      if (filterGender && parseGender(app?.experience ?? '') !== filterGender) return false;
      if (filterSchedule && (app?.preferred_schedule ?? '') !== filterSchedule) return false;
      return true;
    })
    .sort((a, b) => {
      const appA = approvedApps[a.id];
      const appB = approvedApps[b.id];
      switch (sortKey) {
        case 'expiry_asc': return (a.expiry_date ?? '').localeCompare(b.expiry_date ?? '');
        case 'expiry_desc': return (b.expiry_date ?? '').localeCompare(a.expiry_date ?? '');
        case 'tickets_asc': return a.tickets - b.tickets;
        case 'tickets_desc': return b.tickets - a.tickets;
        case 'age_asc': return parseInt(appA?.age ?? '0') - parseInt(appB?.age ?? '0');
        case 'age_desc': return parseInt(appB?.age ?? '0') - parseInt(appA?.age ?? '0');
        case 'created_asc': return (a.created_at ?? '').localeCompare(b.created_at ?? '');
        default: return (b.created_at ?? '').localeCompare(a.created_at ?? '');
      }
    });

  return (
    <div className="space-y-6">
      {toast && (
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg text-sm font-medium
          ${toast.ok ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'}`}>
          {toast.ok ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
          {toast.msg}
        </div>
      )}

      {/* Pending Applications */}
      {applications.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock size={16} className="text-amber-500" />
              <h3 className="font-semibold text-slate-900">대기 중인 신청</h3>
              <Badge variant="warning">{applications.length}</Badge>
            </div>
            <Button size="sm" variant="ghost" onClick={loadData}><RefreshCw size={14} /></Button>
          </div>
          <div className="divide-y divide-slate-50">
            {applications.map((app) => {
              const gender = parseGender(app.experience);
              return (
                <div key={app.id} className="px-5 py-3.5 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <button
                      onClick={() => openDetail({ type: 'app', data: app })}
                      className="font-medium text-slate-900 text-sm hover:text-amber-600 transition-colors truncate"
                    >
                      {app.full_name}
                    </button>
                    <span className="text-xs text-slate-400 shrink-0">{app.age}</span>
                    <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full shrink-0">{gender}</span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs text-slate-400">{new Date(app.created_at).toLocaleDateString('ko-KR')}</span>
                    <Button size="sm" variant="success" onClick={() => {
                      const prod = products.find(p => p.id === app.product_id);
                      setApproveModal(app);
                      setApproveForm({
                        tickets: prod?.tickets ?? 4,
                        payment: prod?.total_price ?? 0,
                        unit: prod?.unit_price ?? 0,
                        phone: app.phone || '',
                        password: '',
                      });
                    }}>
                      승인
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Students List */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Users size={16} className="text-slate-500" />
              <h3 className="font-semibold text-slate-900">전체 학생 ({filteredStudents.length}명)</h3>
            </div>
            <Button size="sm" variant="ghost" onClick={loadData}><RefreshCw size={14} /></Button>
          </div>
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="이름 또는 전화번호 검색..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 pr-4 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-400"
            />
          </div>
          <div className="flex flex-wrap gap-2 mt-2">
            {(
              [
                { value: filterGender, setter: setFilterGender, options: [['', '성별 전체'], ['남성', '남성'], ['여성', '여성']] },
                { value: filterSchedule, setter: setFilterSchedule, options: [['', '수업방식 전체'], ['대면', '대면'], ['비대면', '비대면'], ['혼합', '혼합']] },
              ] as const
            ).map((ctrl, i) => (
              <select
                key={i}
                value={ctrl.value}
                onChange={e => ctrl.setter(e.target.value)}
                className="flex-1 min-w-[100px] px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-400"
              >
                {ctrl.options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            ))}
            <select
              value={sortKey}
              onChange={e => setSortKey(e.target.value)}
              className="flex-1 min-w-[140px] px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-400"
            >
              <option value="created_desc">최근 등록순</option>
              <option value="created_asc">오래된 순</option>
              <option value="expiry_asc">만료 임박순</option>
              <option value="expiry_desc">만료 여유순</option>
              <option value="tickets_asc">티켓 적은 순</option>
              <option value="tickets_desc">티켓 많은 순</option>
              <option value="age_asc">나이 적은 순</option>
              <option value="age_desc">나이 많은 순</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12 text-slate-400">
            <RefreshCw size={18} className="animate-spin mr-2" />불러오는 중...
          </div>
        ) : filteredStudents.length === 0 ? (
          <div className="text-center py-10 text-slate-400 text-sm">학생이 없습니다.</div>
        ) : (
          <div className="divide-y divide-slate-50">
            {filteredStudents.map((student) => {
              const expiry = student.expiry_date ? new Date(student.expiry_date) : null;
              const daysLeft = expiry ? Math.floor((expiry.getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : null;
              const linkedApp = approvedApps[student.id] || null;
              const gender = linkedApp ? parseGender(linkedApp.experience) : '—';
              const age = linkedApp ? linkedApp.age : '—';
              return (
                <div key={student.id} className="px-5 py-3.5 flex items-center justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <button
                        onClick={() => openDetail({ type: 'student', data: student, app: linkedApp })}
                        className="font-medium text-slate-900 text-sm hover:text-amber-600 transition-colors"
                      >
                        {student.full_name}
                      </button>
                      <Badge variant={student.status === 'active' ? 'success' : student.status === 'pending' ? 'warning' : 'danger'}>
                        {student.status === 'active' ? '수강중' : student.status === 'pending' ? '대기' : '정지'}
                      </Badge>
                      <span className="text-xs text-slate-400">{age}</span>
                      <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">{gender}</span>
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-xs text-slate-400">
                      <span>{student.phone}</span>
                      <span>티켓 {student.tickets}장</span>
                      <span>포인트 {student.points}점</span>
                      {daysLeft !== null && (
                        <span className={daysLeft < 0 ? 'text-red-500' : daysLeft <= 7 ? 'text-amber-500' : ''}>
                          {daysLeft < 0 ? '만료' : `${daysLeft}일 남음`}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => handleStatusToggle(student)}
                      className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors"
                      title={student.status === 'active' ? '정지' : '활성화'}
                    >
                      {student.status === 'active'
                        ? <XCircle size={16} className="text-amber-500" />
                        : <CheckCircle size={16} className="text-emerald-500" />}
                    </button>
                    <button
                      onClick={() => setDeleteModal(student)}
                      className="p-1.5 hover:bg-red-50 rounded-lg transition-colors text-red-400"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Detail Modal */}
      <Modal
        open={!!detailModal}
        onClose={() => setDetailModal(null)}
        title={detailModal ? detailModal.data.full_name : ''}
        size="lg"
      >
        {detailModal && (
          <div className="space-y-4">
            {detailModal.type === 'student' && (
              <div className="flex gap-1 bg-slate-100 rounded-xl p-1">
                <button
                  onClick={() => setDetailTab('app')}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-medium rounded-lg transition-all
                    ${detailTab === 'app' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  <ClipboardList size={13} /> 신청서
                </button>
                <button
                  onClick={() => setDetailTab('edit')}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-medium rounded-lg transition-all
                    ${detailTab === 'edit' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  <Pencil size={13} /> 정보 수정
                </button>
                <button
                  onClick={() => setDetailTab('activity')}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-medium rounded-lg transition-all
                    ${detailTab === 'activity' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  <Gamepad2 size={13} /> 챌린지 활동
                </button>
              </div>
            )}

            {detailModal.type === 'app' ? (
              <AppDetailContent
                app={detailModal.data}
                showMemo={false}
                memoValue={memoValue}
                memoSaving={memoSaving}
                onMemoChange={setMemoValue}
                onMemoSave={handleSaveMemo}
              />
            ) : detailTab === 'activity' ? (
              <ActivityTab userId={detailModal.data.id} />
            ) : detailTab === 'app' ? (
              detailModal.app
                ? <AppDetailContent
                    app={detailModal.app}
                    showMemo={true}
                    memoValue={memoValue}
                    memoSaving={memoSaving}
                    onMemoChange={setMemoValue}
                    onMemoSave={handleSaveMemo}
                  />
                : <p className="text-sm text-slate-500 text-center py-6">연결된 신청서가 없습니다.</p>
            ) : (
              <StudentEditForm
                student={detailModal.data}
                onSave={handleSaveStudentProfile}
                onOpenStudioLevels={openStudioLevelModal}
                saving={editSaving}
              />
            )}
          </div>
        )}
      </Modal>

      {/* Studio Level Modal */}
      <Modal
        open={!!studioLevelStudent}
        onClose={() => {
          if (unlockingRoomId) return;
          setStudioLevelStudent(null);
          setStudioLevelError('');
        }}
        title="작업실 레벨 관리"
      >
        {studioLevelStudent && (
          <div className="space-y-4">
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
              <p className="text-xs text-slate-500">선택한 학생</p>
              <p className="mt-0.5 text-sm font-semibold text-slate-900">
                {studioLevelStudent.full_name}
              </p>
            </div>

            {studioLevelError && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {studioLevelError}
              </div>
            )}

            <div className="space-y-2">
              {ADMIN_ROOM_OPTIONS.map(room => {
                const isDefault = room.id === 'room_lv1';
                const isUnlocked = isDefault
                  || studioLevelStudent.unlocked_rooms?.includes(room.id);
                const isUpdating = unlockingRoomId === room.id;

                return (
                  <div
                    key={room.id}
                    className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 px-4 py-3"
                  >
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-slate-400">{room.level}</p>
                      <p className="truncate text-sm font-semibold text-slate-900">{room.name}</p>
                    </div>

                    {isDefault ? (
                      <span className="shrink-0 rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-500">
                        기본 해금
                      </span>
                    ) : isUnlocked ? (
                      <button
                        type="button"
                        disabled={!!unlockingRoomId}
                        onClick={() => handleLockRoom(room.id)}
                        className="shrink-0 rounded-lg bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-600 transition-colors hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {isUpdating ? '처리 중...' : '해금 취소'}
                      </button>
                    ) : (
                      <button
                        type="button"
                        disabled={!!unlockingRoomId}
                        onClick={() => handleUnlockRoom(room.id)}
                        className="shrink-0 rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {isUpdating ? '처리 중...' : '해금'}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </Modal>

      {/* Approve Modal */}
      <Modal open={!!approveModal} onClose={() => setApproveModal(null)} title="수강 승인">
        {approveModal && (
          <div className="space-y-4">
            <div className="bg-slate-50 rounded-xl p-3 text-sm">
              <p className="font-medium text-slate-900">{approveModal.full_name}</p>
              <p className="text-slate-500 text-xs">{approveModal.phone}</p>
              {approveModal.product_id && (() => {
                const prod = products.find(p => p.id === approveModal.product_id);
                return prod ? (
                  <p className="mt-1 text-xs text-amber-600 font-medium">{prod.name}</p>
                ) : null;
              })()}
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium text-slate-700 block mb-1">전화번호</label>
                <input
                  type="tel"
                  value={approveForm.phone}
                  onChange={(e) => setApproveForm({ ...approveForm, phone: e.target.value })}
                  placeholder="010-0000-0000"
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
                />
                <p className="text-xs text-slate-400 mt-0.5">로그인 시 이 번호를 사용합니다</p>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700 block mb-1">임시 비밀번호</label>
                <input
                  type="text"
                  value={approveForm.password}
                  onChange={(e) => setApproveForm({ ...approveForm, password: e.target.value })}
                  placeholder="6자 이상"
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
                />
              </div>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: '티켓 수', key: 'tickets' as const, placeholder: '4' },
                  { label: '결제 금액', key: 'payment' as const, placeholder: '0' },
                  { label: '단가', key: 'unit' as const, placeholder: '0' },
                ].map(({ label, key, placeholder }) => (
                  <div key={key}>
                    <label className="text-xs font-medium text-slate-600 block mb-1">{label}</label>
                    <input
                      type="number"
                      value={approveForm[key]}
                      onChange={(e) => setApproveForm({ ...approveForm, [key]: Number(e.target.value) })}
                      placeholder={placeholder}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
                    />
                  </div>
                ))}
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <Button variant="secondary" onClick={() => setApproveModal(null)} className="flex-1">취소</Button>
              <Button variant="success" loading={actionLoading} onClick={handleApprove} className="flex-1">승인 완료</Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Delete Modal */}
      <Modal open={!!deleteModal} onClose={() => setDeleteModal(null)} title="학생 삭제">
        {deleteModal && (
          <div className="space-y-4">
            <div className="bg-red-50 border border-red-200 rounded-xl p-4">
              <p className="text-sm font-medium text-red-800 mb-1">경고: 이 작업은 되돌릴 수 없습니다</p>
              <p className="text-xs text-red-700">
                <strong>{deleteModal.full_name}</strong>의 모든 데이터(예약, 포인트, 내역)가 영구 삭제됩니다.
              </p>
            </div>
            <div className="flex gap-3">
              <Button variant="secondary" onClick={() => setDeleteModal(null)} className="flex-1">취소</Button>
              <Button variant="danger" loading={actionLoading} onClick={() => handleDeleteStudent(deleteModal)} className="flex-1">삭제 확정</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
