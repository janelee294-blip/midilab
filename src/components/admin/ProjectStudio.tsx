import React, { useState, useEffect, useCallback } from 'react';
import { Music2, RefreshCw, CheckCircle2 } from 'lucide-react';
import { supabase, type ProjectWork } from '../../lib/supabase';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';

export function ProjectStudio({ onAction }: { onAction?: () => void }) {
  const [works, setWorks] = useState<ProjectWork[]>([]);
  const [loading, setLoading] = useState(true);
  const [completingId, setCompletingId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  const showToast = (msg: string, ok: boolean) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3000);
  };

  const loadWorks = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('project_works')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: false });
    setWorks(data || []);
    setLoading(false);
  }, []);

  useEffect(() => { loadWorks(); }, [loadWorks]);

  async function handleComplete(id: string) {
    setCompletingId(id);
    const { error } = await supabase
      .from('project_works')
      .update({ status: 'completed' })
      .eq('id', id);
    if (error) {
      showToast('처리 실패: ' + error.message, false);
    } else {
      showToast('작업 완료로 처리되었습니다.', true);
      setWorks(prev => prev.filter(w => w.id !== id));
      onAction?.();
    }
    setCompletingId(null);
  }

  return (
    <div className="space-y-5">
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-xl shadow-lg text-sm font-medium border
          ${toast.ok ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
          {toast.msg}
        </div>
      )}

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Music2 size={16} className="text-rose-500" />
            <h3 className="font-semibold text-slate-900">음원 작업실</h3>
            {works.length > 0 && <Badge variant="danger">{works.length}</Badge>}
          </div>
          <Button size="sm" variant="ghost" onClick={loadWorks}>
            <RefreshCw size={14} />
          </Button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-10 text-slate-400">
            <RefreshCw size={18} className="animate-spin mr-2" />불러오는 중...
          </div>
        ) : works.length === 0 ? (
          <div className="text-center py-14 text-slate-400 text-sm">
            <Music2 size={32} className="mx-auto mb-3 opacity-20" />
            대기 중인 음원 작업이 없습니다.
          </div>
        ) : (
          <div className="divide-y divide-slate-50">
            {works.map(work => (
              <div key={work.id} className="px-5 py-4 flex items-center justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="font-medium text-slate-900 text-sm">{work.student_name}</span>
                    <Badge variant="warning">작업 대기</Badge>
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <p className="text-xs text-slate-600">{work.product_name}</p>
                    {work.price > 0 && (
                      <span className="text-xs font-semibold text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded">
                        {work.price.toLocaleString()}원
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    등록일: {new Date(work.created_at).toLocaleDateString('ko-KR')}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="success"
                  loading={completingId === work.id}
                  onClick={() => handleComplete(work.id)}
                >
                  <CheckCircle2 size={13} />
                  작업 완료
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 text-sm text-rose-800">
        <strong>안내:</strong> 재등록 승인 시 '음원 작업' 옵션이 포함된 신청이 자동으로 이곳에 등록됩니다.
        [작업 완료] 버튼을 누르기 전까지 명단이 유지됩니다.
      </div>
    </div>
  );
}
