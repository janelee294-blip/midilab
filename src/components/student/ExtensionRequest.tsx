import React, { useState, useEffect } from 'react';
import { supabase, type Profile } from '../../lib/supabase';
import { sendDiscordNotification, DISCORD_COLORS } from '../../lib/discord';
import { Button } from '../ui/Button';

const MAX_EXTENSIONS = 4;

interface ExtensionRequestProps {
  profile: Profile;
  onRefreshProfile: () => void;
}

export function ExtensionRequest({ profile, onRefreshProfile }: ExtensionRequestProps) {
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [approvedCount, setApprovedCount] = useState(0);
  const [hasPending, setHasPending] = useState(false);

  useEffect(() => {
    supabase
      .from('extensions')
      .select('id, status')
      .eq('user_id', profile.id)
      .then(({ data }) => {
        const rows = data || [];
        setApprovedCount(rows.filter(r => r.status === 'approved').length);
        setHasPending(rows.some(r => r.status === 'pending'));
      });
  }, [profile.id, success]);

  const expiryDate = profile.expiry_date ? new Date(profile.expiry_date) : null;
  const today = new Date();
  const daysLeft = expiryDate ? Math.floor((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)) : null;
  const canExtend = approvedCount < MAX_EXTENSIONS;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!reason.trim()) return;
    setError('');
    setLoading(true);

    const { error: dbError } = await supabase.from('extensions').insert({
      user_id: profile.id,
      reason,
      status: 'pending',
      days_requested: 7,
    });

    if (dbError) {
      setError('신청 중 오류가 발생했습니다.');
      setLoading(false);
      return;
    }

    await sendDiscordNotification(
      '연장 신청',
      `**학생:** ${profile.full_name}\n**현재 만료일:** ${profile.expiry_date?.slice(0, 10)}\n**사유:** ${reason}`,
      DISCORD_COLORS.INFO
    );

    setSuccess(true);
    setReason('');
    setLoading(false);
  }

  return (
    <div className="space-y-4">
      <h3 className="font-semibold text-white">수강 기간 연장 신청</h3>

      {expiryDate && (
        <div className={`p-4 rounded-xl border ${daysLeft !== null && daysLeft <= 7
          ? 'bg-amber-500/10 border-amber-500/30'
          : 'bg-[#0b0f19] border-[#1e2940]'
        }`}>
          <p className="text-sm text-[#8fa0dd]">
            만료일: <span className="font-semibold text-white">{expiryDate.toLocaleDateString('ko-KR')}</span>
          </p>
          {daysLeft !== null && (
            <p className={`text-sm mt-0.5 ${daysLeft <= 3 ? 'text-red-400 font-medium' : 'text-[#475569]'}`}>
              {daysLeft > 0 ? `${daysLeft}일 남음` : '만료됨'}
            </p>
          )}
          <p className="text-xs text-[#334155] mt-1">
            최대 연장 한도: 28일 (7일 연장 × 최대 4회) · 사용 {approvedCount}/{MAX_EXTENSIONS}회
          </p>
        </div>
      )}

      {success ? (
        <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4 text-sm text-emerald-400">
          연장 신청이 접수되었습니다. 관리자 승인 후 자동 적용됩니다.
        </div>
      ) : !canExtend ? (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 text-sm text-amber-400">
          최대 연장 한도(28일, 4회)에 도달하여 추가 연장이 불가합니다.
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          {hasPending && (
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3 text-xs text-amber-400">
              이미 승인 대기 중인 연장 신청이 있습니다.
            </div>
          )}
          {error && <div className="text-sm text-red-400">{error}</div>}
          <div>
            <label className="text-sm font-medium text-[#8fa0dd] block mb-1.5">
              연장 사유 <span className="text-[#22d3ee]">*</span>
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="연장을 원하시는 사유를 상세히 적어주세요..."
              required
              rows={4}
              className="w-full px-3 py-2.5 bg-[#0b0f19] border border-[#1e2940] rounded-xl text-sm text-white placeholder-[#334155] focus:outline-none focus:border-[#22d3ee] focus:ring-1 focus:ring-[#22d3ee]/30 resize-none transition-all"
            />
          </div>
          <Button
            type="submit"
            variant="cyan"
            loading={loading}
            disabled={hasPending}
            className="w-full justify-center"
          >
            연장 신청하기 (+7일)
          </Button>
        </form>
      )}
    </div>
  );
}
