import React, { useState, useEffect, useCallback } from 'react';
import { Calculator, RefreshCw, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { insertFinancialEvent } from '../../lib/adminApi';
import { sendStudentWebhook } from '../../lib/discord';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';

interface RefundItem {
  regId: string;
  studentId: string;
  studentName: string;
  phone: string;
  currentTickets: number;
  lastGranted: number;
  totalPaid: number;
  targetRemain: number;
  refundAmount: number;
  canRefund: boolean;
  refundReason: string | null;
  productName: string;
  createdAt: string;
  durationDays: number;
  expiryDate: string | null;
}

export function RefundCalculator({ onAction }: { onAction?: () => void }) {
  const [items, setItems] = useState<RefundItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  function showToast(msg: string, ok: boolean) {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3500);
  }

  const loadData = useCallback(async () => {
    setLoading(true);

    const { data: regs } = await supabase
      .from('registrations')
      .select('id, student_id, total_price, refund_reason, created_at, products(name, tickets, duration_days)')
      .eq('status', 'refund_requested')
      .order('created_at', { ascending: false });

    if (!regs || regs.length === 0) { setItems([]); setLoading(false); return; }

    const studentIds = [...new Set(regs.map((r: any) => r.student_id))];
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, full_name, phone, tickets, expiry_date')
      .in('id', studentIds);

    const profileMap = Object.fromEntries((profiles || []).map((p: any) => [p.id, p]));

    const computed: RefundItem[] = regs.map((r: any) => {
      const p = profileMap[r.student_id] || {};
      const currentTickets: number = p.tickets ?? 0;
      // 최초 등록자 폴백: product.tickets가 0이면 현재 잔여 티켓을 기준으로 사용
      const lastGranted: number = (r.products?.tickets ?? 0) || currentTickets;
      const totalPaid: number = r.total_price || 0;
      const unitPrice: number = lastGranted > 0 ? Math.round(totalPaid / lastGranted) : 0;
      const targetRemain: number = Math.min(currentTickets, lastGranted);
      const canRefund: boolean = lastGranted > 0 && targetRemain > lastGranted / 2;
      return {
        regId: r.id,
        studentId: r.student_id,
        studentName: p.full_name ?? '—',
        phone: p.phone ?? '—',
        currentTickets,
        lastGranted,
        totalPaid,
        targetRemain,
        refundAmount: canRefund ? targetRemain * unitPrice : 0,
        canRefund,
        refundReason: r.refund_reason ?? null,
        productName: r.products?.name ?? '—',
        createdAt: r.created_at,
        durationDays: r.products?.duration_days ?? 0,
        expiryDate: p.expiry_date ?? null,
      };
    });

    setItems(computed);
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  async function handleApprove(item: RefundItem) {
    setProcessingId(item.regId);
    const { error: r1 } = await supabase
      .from('registrations')
      .update({ status: 'refunded' })
      .eq('id', item.regId);

    // 유효기간 차감: 결제 상품의 duration_days만큼 빼고, 과거가 되면 현재로 클램프
    let newExpiry: string | null = null;
    if (item.durationDays > 0 && item.expiryDate) {
      const base = new Date(item.expiryDate);
      base.setDate(base.getDate() - item.durationDays);
      const now = new Date();
      newExpiry = (base < now ? now : base).toISOString();
    }

    const profileUpdate: Record<string, unknown> = {
      tickets: Math.max(0, item.currentTickets - item.targetRemain),
    };
    if (newExpiry) profileUpdate.expiry_date = newExpiry;

    const { error: r2 } = await supabase
      .from('profiles')
      .update(profileUpdate)
      .eq('id', item.studentId);
    if (r1 || r2) {
      showToast('처리 중 오류가 발생했습니다.', false);
    } else {
      // 환불 비용을 재무 원장에 기록 (물리 삭제 없이 cost로 추적)
      if (item.refundAmount > 0) {
        await insertFinancialEvent({
          type: 'cost',
          amount: -item.refundAmount,
          source: 'refund',
          note: `환불 승인: ${item.productName} (${item.studentName})`,
          student_id: item.studentId,
        });
      }

      showToast(`${item.studentName} 환불 승인 완료.`, true);
      setItems(prev => prev.filter(i => i.regId !== item.regId));

      console.log('[WEBHOOK_STEP1] WEBHOOK_TRIGGER', 'refund_approved', item.studentId);
      await sendStudentWebhook(item.studentId, 'refund_approved', {
        refundAmount: item.refundAmount,
        tickets: Math.max(0, item.currentTickets - item.targetRemain),
      });

      onAction?.();
    }
    setProcessingId(null);
  }

  async function handleReject(item: RefundItem) {
    setProcessingId(item.regId);
    const { error } = await supabase
      .from('registrations')
      .update({ status: 'approved' })
      .eq('id', item.regId);
    if (error) {
      showToast('처리 중 오류가 발생했습니다.', false);
    } else {
      showToast(`${item.studentName} 환불 거절 — 승인 상태로 복구됨.`, true);
      setItems(prev => prev.filter(i => i.regId !== item.regId));
      console.log('[WEBHOOK_STEP1] WEBHOOK_TRIGGER', 'refund_rejected', item.studentId);
      await sendStudentWebhook(item.studentId, 'refund_rejected', {});
      onAction?.();
    }
    setProcessingId(null);
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      {toast && (
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg text-sm font-medium
          ${toast.ok ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'}`}>
          {toast.ok ? <CheckCircle size={16} /> : <XCircle size={16} />}
          {toast.msg}
        </div>
      )}

      <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Calculator size={16} className="text-slate-500" />
          <h3 className="font-semibold text-slate-900">환불 신청목록</h3>
          {items.length > 0 && (
            <span className="text-xs font-medium bg-red-100 text-red-600 px-2 py-0.5 rounded-full">{items.length}</span>
          )}
        </div>
        <button onClick={loadData} className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors">
          <RefreshCw size={14} className={`text-slate-500 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-10 text-slate-400 gap-2">
          <RefreshCw size={16} className="animate-spin" />
          <span className="text-sm">불러오는 중...</span>
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-10 text-slate-400 text-sm">환불 신청 내역이 없습니다.</div>
      ) : (
        <div className="divide-y divide-slate-100">
          {items.map(item => (
            <div key={item.regId} className="px-5 py-5 space-y-3">
              {/* Header */}
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-semibold text-slate-900 text-sm">{item.studentName}</p>
                  <p className="text-xs text-slate-500">{item.phone}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{item.productName} · {new Date(item.createdAt).toLocaleDateString('ko-KR')}</p>
                </div>
                <Badge variant={item.canRefund ? 'success' : 'danger'}>
                  {item.canRefund ? '환불 가능' : '환불 불가'}
                </Badge>
              </div>

              {/* Refund reason */}
              {item.refundReason && (
                <div className="bg-slate-50 rounded-xl px-3 py-2.5 text-xs text-slate-600">
                  <span className="font-medium text-slate-400 mr-1">사유:</span>
                  {item.refundReason}
                </div>
              )}

              {/* Calculation */}
              <div className="grid grid-cols-4 gap-2 text-xs">
                <div className="bg-slate-50 rounded-lg p-2 text-center">
                  <p className="text-slate-400">결제 티켓</p>
                  <p className="font-semibold text-slate-700">{item.lastGranted}장</p>
                </div>
                <div className="bg-slate-50 rounded-lg p-2 text-center">
                  <p className="text-slate-400">현 잔여</p>
                  <p className="font-semibold text-slate-700">{item.currentTickets}장</p>
                </div>
                <div className="bg-slate-50 rounded-lg p-2 text-center">
                  <p className="text-slate-400">산정 잔여</p>
                  <p className="font-semibold text-slate-700">{item.targetRemain}장</p>
                </div>
                <div className={`rounded-lg p-2 text-center ${item.canRefund ? 'bg-blue-50' : 'bg-red-50'}`}>
                  <p className={item.canRefund ? 'text-blue-400' : 'text-red-400'}>환불액</p>
                  <p className={`font-semibold ${item.canRefund ? 'text-blue-700' : 'text-red-400'}`}>
                    {item.canRefund ? `${item.refundAmount.toLocaleString()}원` : '—'}
                  </p>
                </div>
              </div>

              {/* Actions */}
              {item.canRefund ? (
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="danger"
                    loading={processingId === item.regId}
                    onClick={() => handleApprove(item)}
                    className="flex-1 justify-center"
                  >
                    환불 승인
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    loading={processingId === item.regId}
                    onClick={() => handleReject(item)}
                    className="flex-1 justify-center"
                  >
                    거절
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-2 bg-red-50 border border-red-100 rounded-xl px-3 py-2 text-xs text-red-600 flex-1">
                    <AlertCircle size={13} />
                    50% 이상 소진 환불 불가 ({item.targetRemain} ≤ {item.lastGranted}/2)
                  </div>
                  <Button
                    size="sm"
                    variant="secondary"
                    loading={processingId === item.regId}
                    onClick={() => handleReject(item)}
                  >
                    거절
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
