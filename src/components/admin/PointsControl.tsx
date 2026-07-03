import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Star, Plus, Minus, RefreshCw, RotateCcw, AlertCircle } from 'lucide-react';
import { supabase, type Profile } from '../../lib/supabase';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';

export function PointsControl() {
  const [students, setStudents] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const hasLoadedRef = useRef(false);
  const [adjustLoading, setAdjustLoading] = useState<string | null>(null);
  const [resetModal, setResetModal] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);

  const loadStudents = useCallback(async () => {
    // Show spinner only on initial load; subsequent refetches update data in-place
    if (!hasLoadedRef.current) setLoading(true);
    const { data } = await supabase
      .from('profiles')
      .select('id, full_name, phone, points, status, role')
      .eq('role', 'student')
      .eq('status', 'active')
      .order('points', { ascending: false });
    setStudents(data || []);
    setLoading(false);
    hasLoadedRef.current = true;
  }, []);

  useEffect(() => { loadStudents(); }, [loadStudents]);

  // 변경 후
async function handleAdjust(student: Profile, delta: number) {
  setAdjustLoading(student.id);
  await supabase.rpc('adjust_user_points', {
    p_user_id: student.id,
    p_delta: delta,
    p_reason: `관리자 ${delta > 0 ? '지급' : '차감'} (${delta > 0 ? '+' : ''}${delta}점)`,
  });
  await loadStudents();
  setAdjustLoading(null);
}

  // 변경 후
async function handleMonthlyReset() {
  setResetLoading(true);
  await supabase.rpc('monthly_points_reset');
  setResetModal(false);
  setResetLoading(false);
  loadStudents();
}

  return (
    <div className="space-y-5">

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Star size={16} className="text-amber-500" />
            <h3 className="font-semibold text-slate-900">포인트 관리</h3>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="ghost" onClick={loadStudents}><RefreshCw size={14} /></Button>
            <Button size="sm" variant="danger" onClick={() => setResetModal(true)}>
              <RotateCcw size={14} />
              월간 초기화
            </Button>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12 text-slate-400">
            <RefreshCw size={18} className="animate-spin mr-2" />
            불러오는 중...
          </div>
        ) : students.length === 0 ? (
          <div className="text-center py-10 text-slate-400 text-sm">활성 학생이 없습니다.</div>
        ) : (
          <div className="divide-y divide-slate-50">
            {students.map((student, rank) => (
              <div key={student.id} className="flex items-center justify-between px-5 py-3.5">
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-600">
                    {rank + 1}
                  </div>
                  <div>
                    <p className="font-medium text-slate-900 text-sm">{student.full_name}</p>
                    <p className="text-xs text-slate-400">{(student as any).phone}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-lg font-bold text-slate-800">{student.points}</span>
                  <span className="text-xs text-slate-400">점</span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleAdjust(student, -1)}
                      disabled={adjustLoading === student.id || student.points <= 0}
                      className="w-8 h-8 rounded-lg border border-red-200 bg-red-50 hover:bg-red-100 flex items-center justify-center text-red-600 disabled:opacity-40 transition-all"
                    >
                      <Minus size={14} />
                    </button>
                    <button
                      onClick={() => handleAdjust(student, 1)}
                      disabled={adjustLoading === student.id}
                      className="w-8 h-8 rounded-lg border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 flex items-center justify-center text-emerald-600 disabled:opacity-40 transition-all"
                    >
                      <Plus size={14} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Modal open={resetModal} onClose={() => setResetModal(false)} title="월간 포인트 초기화">
        <div className="space-y-4">
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
            <p className="text-sm font-medium text-amber-800 mb-1">주의: 이 작업은 되돌릴 수 없습니다</p>
            <p className="text-xs text-amber-700">
              현재 모든 학생의 포인트 랭킹을 백업한 후, 전원의 포인트를 0으로 초기화합니다.
              매달 1일에 자동 실행되거나, 여기서 수동으로 실행할 수 있습니다.
            </p>
          </div>
          <div className="flex gap-3">
            <Button variant="secondary" onClick={() => setResetModal(false)} className="flex-1">취소</Button>
            <Button variant="danger" loading={resetLoading} onClick={handleMonthlyReset} className="flex-1">초기화 실행</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
