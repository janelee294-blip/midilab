import React, { useState, useEffect, useCallback } from 'react';
import { Clock, CheckCircle, XCircle, RefreshCw } from 'lucide-react';
import { supabase, type Extension, type Profile } from '../../lib/supabase';
import { sendStudentWebhook } from '../../lib/discord';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Modal } from '../ui/Modal';

export function ExtensionManager({ onAction }: { onAction?: () => void }) {
  const [extensions, setExtensions] = useState<(Extension & { profiles?: Profile })[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [rejectModal, setRejectModal] = useState<string | null>(null);
  const [adminNote, setAdminNote] = useState('');
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  const showToast = (msg: string, ok: boolean) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3000);
  };

  const loadExtensions = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('extensions')
      .select('*, profiles(full_name, phone, expiry_date)')
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(50);
    setExtensions((data || []) as any);
    setLoading(false);
  }, []);

  useEffect(() => { loadExtensions(); }, [loadExtensions]);

  async function handleApprove(ext: Extension & { profiles?: Profile }) {
    setActionLoading(ext.id);

    const currentExpiry = ext.profiles?.expiry_date ? new Date(ext.profiles.expiry_date) : new Date();
    const newExpiry = new Date(Math.max(currentExpiry.getTime(), Date.now()) + 7 * 24 * 60 * 60 * 1000);

    // Check 28-day (4-extension) limit
    const approvedCount = await supabase
      .from('extensions')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', ext.user_id)
      .eq('status', 'approved');
    if ((approvedCount.count ?? 0) >= 4) {
      showToast('최대 4회 연장 한도를 초과합니다.', false);
      setActionLoading(null);
      return;
    }

    await supabase.from('profiles').update({ expiry_date: newExpiry.toISOString() }).eq('id', ext.user_id);
    await supabase.from('extensions').update({
      status: 'approved',
      resolved_at: new Date().toISOString(),
      admin_note: '승인',
    }).eq('id', ext.id);

    console.log('[WEBHOOK_STEP1] WEBHOOK_TRIGGER', 'extension_approved', ext.user_id);
    await sendStudentWebhook(ext.user_id, 'extension_approved', {
      newExpiryDate: newExpiry.toLocaleDateString('ko-KR'),
    });

    showToast('연장 승인이 완료되었습니다.', true);
    setExtensions(prev => prev.filter(e => e.id !== ext.id));
    setActionLoading(null);
    onAction?.();
  }

  async function handleReject(extId: string) {
    setActionLoading(extId);
    const ext = extensions.find(e => e.id === extId);
    await supabase.from('extensions').update({
      status: 'rejected',
      resolved_at: new Date().toISOString(),
      admin_note: adminNote || '거절',
    }).eq('id', extId);

    if (ext?.user_id) {
      console.log('[WEBHOOK_STEP1] WEBHOOK_TRIGGER', 'extension_rejected', ext.user_id);
      await sendStudentWebhook(ext.user_id, 'extension_rejected', {
        adminNote: adminNote || undefined,
      });
    }

    showToast('연장 신청이 거절되었습니다.', true);
    setRejectModal(null);
    setAdminNote('');
    setExtensions(prev => prev.filter(e => e.id !== extId));
    setActionLoading(null);
    onAction?.();
  }

  return (
    <div className="space-y-5">
      {toast && (
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg text-sm font-medium
          ${toast.ok ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'}`}>
          {toast.ok ? <CheckCircle size={16} /> : <XCircle size={16} />}
          {toast.msg}
        </div>
      )}

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock size={16} className="text-amber-500" />
            <h3 className="font-semibold text-slate-900">연장 신청 관리</h3>
            {extensions.length > 0 && <Badge variant="warning">{extensions.length}</Badge>}
          </div>
          <Button size="sm" variant="ghost" onClick={loadExtensions}><RefreshCw size={14} /></Button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-10 text-slate-400">
            <RefreshCw size={18} className="animate-spin mr-2" />불러오는 중...
          </div>
        ) : extensions.length === 0 ? (
          <div className="text-center py-10 text-slate-400 text-sm">대기 중인 연장 신청이 없습니다.</div>
        ) : (
          <div className="divide-y divide-slate-50">
            {extensions.map((ext: any) => (
              <div key={ext.id} className="px-5 py-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <p className="font-medium text-slate-900 text-sm">{ext.profiles?.full_name}</p>
                      <Badge variant={ext.status === 'pending' ? 'warning' : ext.status === 'approved' ? 'success' : 'danger'}>
                        {ext.status === 'pending' ? '대기' : ext.status === 'approved' ? '승인' : '거절'}
                      </Badge>
                    </div>
                    <p className="text-xs text-slate-500 mb-1">{(ext.profiles as any)?.phone}</p>
                    <p className="text-xs text-slate-600 bg-slate-50 rounded-lg px-3 py-2 mt-1">"{ext.reason}"</p>
                    <p className="text-xs text-slate-400 mt-1">신청일: {new Date(ext.created_at).toLocaleDateString('ko-KR')}</p>
                    {ext.profiles?.expiry_date && (
                      <p className="text-xs text-slate-400">현재 만료일: {new Date(ext.profiles.expiry_date).toLocaleDateString('ko-KR')}</p>
                    )}
                  </div>
                  {ext.status === 'pending' && (
                    <div className="flex gap-2 shrink-0">
                      <Button size="sm" variant="success" loading={actionLoading === ext.id} onClick={() => handleApprove(ext)}>승인</Button>
                      <Button size="sm" variant="danger" onClick={() => { setRejectModal(ext.id); setAdminNote(''); }}>거절</Button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Modal open={!!rejectModal} onClose={() => setRejectModal(null)} title="연장 신청 거절">
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-slate-700 block mb-1.5">거절 사유 (선택)</label>
            <textarea
              value={adminNote}
              onChange={(e) => setAdminNote(e.target.value)}
              rows={3}
              placeholder="학생에게 전달할 사유를 입력하세요..."
              className="w-full px-3 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-slate-400 resize-none"
            />
          </div>
          <div className="flex gap-3">
            <Button variant="secondary" onClick={() => setRejectModal(null)} className="flex-1">취소</Button>
            <Button variant="danger" loading={actionLoading === rejectModal} onClick={() => rejectModal && handleReject(rejectModal)} className="flex-1">거절 확정</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
