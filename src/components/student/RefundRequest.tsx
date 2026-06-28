import React, { useState, useEffect } from 'react';
import { RotateCcw, RefreshCw, CheckCircle, AlertCircle } from 'lucide-react';
import { supabase, type Profile } from '../../lib/supabase';
import { sendDiscordNotification, DISCORD_COLORS } from '../../lib/discord';
import { Button } from '../ui/Button';

interface Props {
  profile: Profile;
  futureBookings: number;
}

interface LastReg {
  id: string;
  total_price: number;
  created_at: string;
  status: string;
  products: { name: string; tickets: number } | null;
}

export function RefundRequest({ profile, futureBookings }: Props) {
  const [loading, setLoading] = useState(true);
  const [lastReg, setLastReg] = useState<LastReg | null>(null);
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    async function load() {
      const { data: projectProds } = await supabase
        .from('products')
        .select('id')
        .eq('is_project_work', true);
      const projectProdIds = new Set((projectProds || []).map((p: any) => p.id));

      const { data: regs } = await supabase
        .from('registrations')
        .select('id, total_price, created_at, status, selected_options, products(name, tickets)')
        .eq('student_id', profile.id)
        .in('status', ['approved', 'refund_requested'])
        .order('created_at', { ascending: false });

      const eligible = (regs || []).find((r: any) => {
        const opts: string[] = r.selected_options || [];
        return !opts.some((id: string) => projectProdIds.has(id));
      });

      setLastReg((eligible as LastReg) || null);
      setLoading(false);
    }
    load();
  }, [profile.id, submitted]);

  async function handleSubmit() {
    if (!lastReg || !reason.trim()) return;
    setSubmitting(true);
    setError('');

    const { error: dbErr } = await supabase
      .from('registrations')
      .update({ status: 'refund_requested', refund_reason: reason.trim() })
      .eq('id', lastReg.id);

    if (dbErr) {
      setError('신청 중 오류가 발생했습니다.');
    } else {
      await sendDiscordNotification(
        '환불 신청',
        `**학생:** ${profile.full_name}\n**상품:** ${(lastReg as any).products?.name ?? '—'}\n**사유:** ${reason.trim()}`,
        DISCORD_COLORS.WARNING
      );
      setSubmitted(true);
    }
    setSubmitting(false);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 text-[#475569] text-sm py-8">
        <RefreshCw size={14} className="animate-spin" />
        불러오는 중...
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="font-semibold text-white mb-0.5 flex items-center gap-2">
          <RotateCcw size={16} className="text-[#8fa0dd]" />
          환불 신청
        </h3>
        <p className="text-xs text-[#475569]">일반 레슨 결제 건에 한해 환불 신청이 가능합니다.</p>
      </div>

      {!lastReg ? (
        <div className="flex items-center gap-2 text-[#475569] text-sm py-4">
          <AlertCircle size={15} />
          환불 신청 가능한 결제 내역이 없습니다.
        </div>
      ) : lastReg.status === 'refund_requested' ? (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 flex items-start gap-3">
          <CheckCircle size={16} className="text-amber-400 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-medium text-amber-300">환불 신청이 접수되었습니다.</p>
            <p className="text-xs text-amber-400/70 mt-0.5">관리자 검토 후 처리됩니다.</p>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="bg-[#0b0f19] border border-[#1e2940] rounded-xl p-4 text-sm">
            <p className="font-medium text-white">{(lastReg as any).products?.name ?? '—'}</p>
            <div className="flex gap-4 mt-1.5 text-xs text-[#475569]">
              <span>{lastReg.total_price.toLocaleString()}원</span>
              <span>{(lastReg as any).products?.tickets ?? 0}회권</span>
              <span>{new Date(lastReg.created_at).toLocaleDateString('ko-KR')}</span>
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-[#8fa0dd] block mb-1.5">
              환불 사유 <span className="text-[#22d3ee]">*</span>
            </label>
            <textarea
              value={reason}
              onChange={e => setReason(e.target.value)}
              rows={3}
              placeholder="환불 사유를 입력해 주세요."
              className="w-full text-sm bg-[#0b0f19] border border-[#1e2940] rounded-xl px-3 py-2.5 text-white placeholder-[#334155] focus:outline-none focus:border-[#22d3ee] focus:ring-1 focus:ring-[#22d3ee]/30 resize-none transition-all"
            />
          </div>

          {error && <p className="text-xs text-red-400">{error}</p>}

          {futureBookings > 0 && (
            <p className="text-xs text-amber-400 flex items-center gap-1.5">
              <AlertCircle size={13} />
              진행 중인 예약 내역을 모두 취소해야 환불 신청이 가능합니다.
            </p>
          )}

          <Button
            onClick={handleSubmit}
            variant="cyan"
            loading={submitting}
            disabled={!reason.trim() || futureBookings > 0}
            className="w-full justify-center"
          >
            환불 신청하기
          </Button>
        </div>
      )}
    </div>
  );
}
