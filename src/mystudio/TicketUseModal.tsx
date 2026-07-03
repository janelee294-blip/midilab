// src/mystudio/TicketUseModal.tsx
import React, { useState } from 'react';
import { X, Send } from 'lucide-react';
import type { Profile } from '../lib/supabase';

export function TicketUseModal({ 
  profile, 
  itemMeta, 
  onClose,
  onUse 
}: { 
  profile: Profile, 
  itemMeta: any, 
  onClose: () => void,
  onUse: () => void 
}) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleUse = async () => {
    setIsSubmitting(true);
    // 🚨 추후 DB 연동 코드가 들어갈 자리입니다.
    setTimeout(() => {
      alert('DB 연동 대기 중: 관리자 전송 로직이 구현되지 않았습니다.');
      setIsSubmitting(false);
      onUse(); // 테스트용 닫기
    }, 1000);
  };

  return (
    <div className="bg-[#0b101e]/95 border border-[#22d3ee]/30 rounded-2xl p-6 w-full max-w-md shadow-2xl relative">
      <button onClick={onClose} className="absolute top-4 right-4 text-white/50 hover:text-white"><X size={20}/></button>
      
      <div className="flex flex-col items-center mt-2 mb-6">
        <span className="text-6xl drop-shadow-[0_0_15px_rgba(34,211,238,0.3)] mb-4">{itemMeta.icon}</span>
        <h3 className="text-white font-black text-xl">{itemMeta.name}</h3>
      </div>

      <div className="bg-[#060b18] rounded-xl p-4 mb-6 border border-white/5 shadow-inner">
        <h4 className="text-[#f9c76d] text-sm font-bold mb-2">⚠️ 사용 전 주의사항</h4>
        <ul className="text-white/60 text-xs space-y-2 list-disc list-inside">
          {itemMeta.id === 'ticket_mix' ? (
            <>
              <li>신청 후에는 작업 취소 및 티켓 환불이 불가능합니다.</li>
              <li>음원 스템(Stem) 파일이 미리 준비되어 있어야 합니다.</li>
              <li>작업 완료까지 영업일 기준 3~5일이 소요될 수 있습니다.</li>
            </>
          ) : (
            <>
              <li>발매 대행은 사전에 믹스/마스터링이 완료된 음원만 가능합니다.</li>
              <li>앨범 커버 이미지는 직접 준비하셔야 합니다.</li>
              <li>신청 시 유통사 심사에 따라 발매 일정이 조정될 수 있습니다.</li>
            </>
          )}
        </ul>
      </div>

      <button 
        onClick={handleUse} 
        disabled={isSubmitting}
        className="w-full py-3.5 rounded-xl bg-gradient-to-r from-[#22d3ee] to-[#0ea5e9] text-[#060b18] font-black hover:scale-[1.02] transition-all disabled:opacity-50 disabled:hover:scale-100 flex justify-center items-center gap-2 shadow-[0_0_20px_rgba(34,211,238,0.3)]"
      >
        <Send size={18} />
        {isSubmitting ? '신청 처리 중...' : '확인 및 사용 신청'}
      </button>
    </div>
  );
}