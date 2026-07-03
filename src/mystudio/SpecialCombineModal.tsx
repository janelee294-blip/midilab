// src/mystudio/SpecialCombineModal.tsx
import React, { useState } from 'react';
import { X, Combine, AlertCircle } from 'lucide-react';
import type { Profile } from '../lib/supabase';
import { supabase } from '../lib/supabase';
import { STUDIO_ASSETS } from './studioAssets';

export function SpecialCombineModal({ 
  profile, 
  inventory, 
  itemMeta, 
  onClose, 
  onSuccess 
}: { 
  profile: Profile, 
  inventory: Record<string, number>, 
  itemMeta: any, 
  onClose: () => void,
  onSuccess: () => void
}) {
  // 🚨 상태 생명주기 분할: 대기 -> 연산 중(애니메이션) -> 성공 -> 실패
  const [phase, setPhase] = useState<'idle' | 'combining' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  
  const COMBINE_REQUIREMENT = itemMeta.combineReq || 10; 
  const currentCount = inventory[itemMeta.id] || 0;
  const canCombine = currentCount >= COMBINE_REQUIREMENT;

  // 🚨 결과물 메타데이터 파싱 (성공 화면에 보여줄 완성체 정보)
  const targetMeta = STUDIO_ASSETS.find(a => a.id === itemMeta.targetItem);

  const handleCombine = async () => {
    if (!canCombine || phase !== 'idle') return;
    setPhase('combining'); // 🚨 애니메이션 트리거

    try {
      const targetId = itemMeta.targetItem;
      if (!targetId) throw new Error("합성 결과물 데이터가 누락되었습니다.");

      // DB 연산
      const newInv = { ...inventory };
      newInv[itemMeta.id] -= COMBINE_REQUIREMENT;
      if (newInv[itemMeta.id] <= 0) delete newInv[itemMeta.id];
      
      newInv[targetId] = (newInv[targetId] || 0) + 1;

      // 물리적 딜레이 강제 주입 (통신이 너무 빠를 경우 애니메이션이 스킵되는 현상 방지)
      const dbPromise = supabase.from('profiles').update({ inventory: newInv }).eq('id', profile.id);
      const delayPromise = new Promise(res => setTimeout(res, 1800)); 
      
      const [{ error }] = await Promise.all([dbPromise, delayPromise]);
      if (error) throw error;

      setPhase('success'); // 🚨 성공 화면으로 전환
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || '알 수 없는 오류가 발생했습니다.');
      setPhase('error'); // 🚨 에러 화면으로 전환
    }
  };

  return (
    <div className="bg-[#0b101e]/95 border border-amber-500/30 rounded-2xl p-6 w-full max-w-sm shadow-2xl relative overflow-hidden">
      
      {/* 🚨 자체 애니메이션 Keyframes */}
      <style>{`
        @keyframes combine-shake {
          0%, 100% { transform: translate(0, 0) scale(1); filter: brightness(1); }
          25% { transform: translate(2px, -2px) scale(1.1); filter: brightness(1.5); }
          50% { transform: translate(-2px, 2px) scale(1.1); filter: brightness(2); }
          75% { transform: translate(-2px, -2px) scale(1.1); filter: brightness(1.5); }
        }
        @keyframes combine-pop {
          0% { transform: scale(0.5); opacity: 0; filter: brightness(3); }
          60% { transform: scale(1.15); filter: brightness(1.5); }
          100% { transform: scale(1); opacity: 1; filter: brightness(1); }
        }
        @keyframes aura-spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>

      {/* 닫기 버튼 (합성 중일 때는 물리적 차단) */}
      {phase !== 'combining' && (
        <button onClick={onClose} className="absolute top-4 right-4 text-white/50 hover:text-white z-50">
          <X size={20}/>
        </button>
      )}
      
      {/* ─── 1. 대기 화면 (기존 UI) ─── */}
      {phase === 'idle' && (
        <div className="animate-in fade-in zoom-in-95 duration-300">
          <div className="flex flex-col items-center mt-4 mb-6">
            <span className="text-6xl drop-shadow-[0_0_15px_rgba(251,191,36,0.3)] mb-4">{itemMeta.icon}</span>
            <h3 className="text-white font-black text-xl">{itemMeta.name} 합성</h3>
            <p className="text-white/60 text-sm mt-2 text-center">조각을 모아 완전체로 결합하십시오.</p>
          </div>

          <div className="bg-black/50 rounded-xl p-4 mb-6 border border-white/10 flex justify-between items-center">
            <span className="text-white/70 font-bold text-sm">보유 수량</span>
            <span className={`font-black text-lg ${canCombine ? 'text-emerald-400' : 'text-red-400'}`}>
              {currentCount} <span className="text-white/30 text-sm">/ {COMBINE_REQUIREMENT}</span>
            </span>
          </div>

          <button 
            onClick={handleCombine} 
            disabled={!canCombine}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white font-black hover:scale-[1.02] transition-all disabled:opacity-30 disabled:hover:scale-100 flex justify-center items-center gap-2 shadow-[0_0_20px_rgba(245,158,11,0.3)]"
          >
            <Combine size={18} />
            {canCombine ? '합성 시작' : '수량 부족'}
          </button>
        </div>
      )}

      {/* ─── 2. 합성 진행 화면 (서스펜스 애니메이션) ─── */}
      {phase === 'combining' && (
        <div className="flex flex-col items-center justify-center py-10">
          <div className="relative flex items-center justify-center w-32 h-32">
            {/* 회전하는 마법진/오라 효과 */}
            <div className="absolute inset-0 rounded-full border-t-2 border-r-2 border-amber-400/80 blur-[2px]" style={{ animation: 'aura-spin 1s linear infinite' }}></div>
            <div className="absolute inset-2 rounded-full border-b-2 border-l-2 border-orange-500/80 blur-[1px]" style={{ animation: 'aura-spin 0.7s linear infinite reverse' }}></div>
            <div className="absolute inset-0 bg-amber-500/20 rounded-full animate-ping"></div>
            
            {/* 진동하는 파편 아이콘 */}
            <span className="text-6xl relative z-10" style={{ animation: 'combine-shake 0.3s ease-in-out infinite' }}>
              {itemMeta.icon}
            </span>
          </div>
          <h3 className="text-amber-400 font-black text-lg mt-8 animate-pulse tracking-widest">
            합성 중...
          </h3>
        </div>
      )}

      {/* ─── 3. 성공 화면 (결과물 연출) ─── */}
      {phase === 'success' && (
        <div className="flex flex-col items-center justify-center py-6" style={{ animation: 'combine-pop 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275) both' }}>
          <div className="relative flex items-center justify-center w-32 h-32 mb-4">
            <div className="absolute inset-0 bg-amber-400/30 blur-2xl rounded-full animate-pulse"></div>
            <div className="absolute inset-0 bg-gradient-to-tr from-amber-300 to-orange-400 rounded-full opacity-20 blur-md"></div>
            <span className="text-7xl drop-shadow-[0_0_40px_rgba(251,191,36,1)] relative z-10">
              {targetMeta?.icon || '✨'}
            </span>
          </div>
          
          <h3 className="text-transparent bg-clip-text bg-gradient-to-r from-amber-200 to-orange-400 font-black text-2xl mb-2 drop-shadow-md">
            합성 성공!
          </h3>
          <p className="text-white/80 text-sm text-center bg-black/40 px-4 py-2 rounded-lg border border-white/10">
            [ <span className="font-bold text-amber-300">{targetMeta?.name || '완전체'}</span> ]<br/>
            아이템을 획득했습니다.
          </p>

          <button 
            onClick={() => { onSuccess(); onClose(); }} 
            className="mt-8 w-full py-3 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold transition-all border border-white/20 hover:border-white/40 shadow-[0_0_15px_rgba(255,255,255,0.05)]"
          >
            확인
          </button>
        </div>
      )}

      {/* ─── 4. 실패 화면 ─── */}
      {phase === 'error' && (
        <div className="flex flex-col items-center justify-center py-8 animate-in zoom-in-95 duration-300">
          <AlertCircle size={60} className="text-red-500 mb-4 drop-shadow-[0_0_15px_rgba(239,68,68,0.5)]" />
          <h3 className="text-red-400 font-black text-xl mb-2">합성 실패</h3>
          <p className="text-white/60 text-xs text-center px-4 mb-6">{errorMessage}</p>
          
          <button 
            onClick={() => setPhase('idle')} 
            className="w-full py-3 rounded-xl bg-red-500/20 text-red-400 font-bold border border-red-500/30 hover:bg-red-500/30 transition-all"
          >
            다시 시도
          </button>
        </div>
      )}

    </div>
  );
}