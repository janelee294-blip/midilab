import React, { useState } from 'react';
import { Sparkles, X, Star, Zap, Gift } from 'lucide-react';
import type { Profile } from '../lib/supabase';
import { supabase } from '../lib/supabase';
import { STUDIO_ASSETS } from './studioAssets';

// 🚨 가챠 시스템 변수 통제 센터 (수시로 바뀌는 기획 수치는 여기서만 수정하십시오)
const GACHA_CONFIG = {
  cost: {
    single: 1,  // 1회 뽑기 기본 비용
    ten: 9      // 10회 연속 뽑기 기본 비용
  },
  prob: { // 🚨 기본 확률 (합계가 정확히 100이 되도록 분배하십시오)
    fail: 50,       // 꽝 확률
    special: 5,    // 스페셜 확률
    passive: 5,    // 패시브 확률
    rare: 30,       // 레어 확률
    epic: 8,        // 에픽 확률
    legendary: 2    // 레전더리 확률
  }
};

export function StudioGacha({
  profile,
  inventory,
  activePassives,
  onClose,
  onUpdate,
}: {
  profile: Profile;
  inventory: Record<string, number>;
  activePassives: Record<string, boolean>;
  onClose: () => void;
  onUpdate?: () => void;
}) {


  const [isSpinning, setIsSpinning] = useState(false);
  const [gachaResults, setGachaResults] = useState<typeof STUDIO_ASSETS[0][]>([]);
  const [ghostMessage, setGhostMessage] = useState(false);
  const [ghostWinMessage, setGhostWinMessage] = useState(false);
  const [showPointWarning, setShowPointWarning] = useState(false);
  const [showError, setShowError] = useState(false);

  // 가챠 획득 가능한 전체 풀 로드
  const gachaPool = STUDIO_ASSETS.filter(item => item.obtain.includes('gacha'));

  const safeInv = inventory;

  const hasPen = (safeInv['lucky_pen'] || 0) > 0 && activePassives["lucky_pen"] !== false;          // 스페셜 +3%
  const hasClover = (safeInv['lucky_clover'] || 0) > 0 && activePassives["lucky_clover"] !== false;    // 레전더리 +3%
  const hasCrystal = (safeInv['lucky_crystal'] || 0) > 0 && activePassives["lucky_crystal"] !== false;  // 에픽 +3%
  const hasMembership = (safeInv['membership_card'] || 0) > 0 && activePassives["membership_card"] !== false; // 비용 10% 할인
  const hasGhost = (safeInv['ghost'] || 0) > 0 && activePassives["ghost"] !== false;            // 도박꾼의 영혼 (50% 더블 or 올인)

  // 🚨 2. 동적 할인 비용 산출 (데이터 파싱 정상화로 이제 정확히 8포인트로 계산됨)
  const finalCostSingle = hasMembership ? Math.max(1, Math.floor(GACHA_CONFIG.cost.single * 0.9)) : GACHA_CONFIG.cost.single;
  const finalCostTen = hasMembership ? Math.max(1, Math.floor(GACHA_CONFIG.cost.ten * 0.9)) : GACHA_CONFIG.cost.ten;

  // 3. 패시브 확률 보정 및 임계값(Threshold) 정상화 연산 로직
  const pullSingleItem = () => {
    const rand = Math.random() * 100; // 0.00 ~ 99.99 난수 발생
    
    // 패시브 아이템 보정치
    const bonusSpecial = hasPen ? 3 : 0;
    const bonusEpic = hasCrystal ? 3 : 0;
    const bonusLegendary = hasClover ? 3 : 0;
    const totalBonus = bonusSpecial + bonusEpic + bonusLegendary;

    // 보정치가 적용된 최종 확률 구간 산출
    const pFail = Math.max(0, GACHA_CONFIG.prob.fail - totalBonus);
    const pSpecial = GACHA_CONFIG.prob.special + bonusSpecial;
    const pPassive = GACHA_CONFIG.prob.passive; // 🚨 누락되었던 패시브 확률 복구
    const pRare = GACHA_CONFIG.prob.rare;
    const pEpic = GACHA_CONFIG.prob.epic + bonusEpic;
    
    // 누적 확률 경계선(Threshold) 계산 (순차적 덧셈)
    const tFail = pFail;
    const tSpecial = tFail + pSpecial;
    const tPassive = tSpecial + pPassive; // 🚨 패시브 경계선 추가
    const tRare = tPassive + pRare;
    const tEpic = tRare + pEpic;

    let targetGrade = '';
    if (rand < tFail) targetGrade = 'fail';
    else if (rand < tSpecial) targetGrade = 'special';
    else if (rand < tPassive) targetGrade = 'passive'; // 🚨 패시브 획득 조건 추가
    else if (rand < tRare) targetGrade = 'rare';
    else if (rand < tEpic) targetGrade = 'epic';
    else targetGrade = 'legendary'; // 이제 정확히 배정된 확률(기본 2% + 클로버 3%)만 적용됨

    // 결정된 라벨(grade)을 가진 아이템 중 랜덤 1개 추출
    const candidates = gachaPool.filter(a => a.grade === targetGrade);
    
    if (candidates.length === 0) return gachaPool[Math.floor(Math.random() * gachaPool.length)];
    return candidates[Math.floor(Math.random() * candidates.length)];
  };

  const handleGacha = async (times: number, finalCost: number) => {
    if (profile.points < finalCost) {
      setShowPointWarning(true);
      return;
    }
    
    setIsSpinning(true);
    setGachaResults([]);

    try {
      let results: typeof STUDIO_ASSETS[0][] = [];
      for (let i = 0; i < times; i++) {
        results.push(pullSingleItem());
      }

      // 4. '도박꾼의 영혼' 연산 발동 (UI 증발 방지 처리)
      if (hasGhost) {
        if (Math.random() < 0.5) {
          results = [...results, ...results]; // 50%: 결과물 2배 복사
          setTimeout(() => {
            setGhostWinMessage(true);
          }, 1500);
        } else {
          results = []; // 50%: 결과물 전량 몰수
          setTimeout(() => {
         setGhostMessage(true);
         }, 1500);
        }
      }

      // 🚨 5. 레이스 컨디션 방지: DB에서 가장 오염되지 않은 최신 인벤토리와 포인트를 직접 동시 조회
      const { data, error: fetchError } = await supabase.from('profiles').select('inventory, points').eq('id', profile.id).single();
      if (fetchError) throw fetchError;

      let currentInv: Record<string, number> = {};
      if (data?.inventory) {
        if (typeof data.inventory === 'string') {
          try {
            let parsed = data.inventory;
            for (let i = 0; i < 4; i++) {
              if (typeof parsed === 'string') parsed = JSON.parse(parsed);
              else break;
            }
            if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) currentInv = parsed;
          } catch {}
        } else if (typeof data.inventory === 'object' && !Array.isArray(data.inventory)) {
          currentInv = data.inventory as Record<string, number>;
        }
      }

      const currentPoints = data?.points ?? profile.points;

      // 🚨 6. 중복지급 차단 분기 프로세스 추가
      results.forEach(item => {
        if (item.grade === 'fail') return; 
        
        // 만약 획득한 아이템의 등급이 패시브인데 장부에 이미 존재하거나, 현재 연속 뽑기 루프 도중 이미 지급되었다면 누적을 완전히 생략
        if (item.grade === 'passive' && (currentInv[item.id] || 0) >= 1) {
          return; 
        }
        
        currentInv[item.id] = (currentInv[item.id] || 0) + 1;
      });

      // 7. 실시간 동기화 정보 일괄 덮어쓰기
      const { error } = await supabase
        .from('profiles')
        .update({ 
          points: currentPoints - finalCost,
          inventory: currentInv
        })
        .eq('id', profile.id);

      if (error) throw error;

      setTimeout(() => {
        setIsSpinning(false);
        setGachaResults(results); 
        if (onUpdate) onUpdate(); 
      }, 1500);

    } catch (error) {
  console.error(error);
  setShowError(true);
}
  };

  return (
    <div className="w-full max-w-lg bg-[#060b18] border border-[#f9c76d]/30 rounded-2xl shadow-[0_0_60px_rgba(249,199,109,0.15)] relative pointer-events-auto flex flex-col overflow-hidden">
      
      {/* ─── 헤더 ─── */}
      <div className="relative px-6 py-5 bg-gradient-to-r from-[#141b2d] to-[#060b18] flex items-center justify-between border-b border-[#1e2940]">
        <div className="flex items-center gap-3 relative z-10">
          <div className="w-10 h-10 rounded-xl bg-[#0b0f19] flex items-center justify-center border border-[#f9c76d]/40 shadow-[0_0_15px_rgba(249,199,109,0.2)]">
            <Sparkles size={20} className="text-[#f9c76d]" />
          </div>
          <div>
            <h2 className="text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white to-[#94a3b8] tracking-widest">
              LUCKY GACHA
            </h2>
            <p className="text-[10px] text-[#f9c76d] font-medium tracking-wide">한정판 스튜디오 아이템을 뽑아보세요</p>
          </div>
        </div>
        <button onClick={onClose} className="p-2 rounded-xl text-[#64748b] hover:text-white transition-all z-10">
          <X size={20} />
        </button>
      </div>

      {/* ─── 메인 캡슐 연출 영역 ─── */}
      <div className={`relative bg-[#0b0f19] flex flex-col items-center justify-center overflow-hidden transition-all duration-300 ${gachaResults.length > 0 ? 'min-h-[18rem] h-auto py-8' : 'h-72'}`}>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(249,199,109,0.1)_0%,transparent_60%)]" />
        
        {/* 🚨 평상시 화면: 결과가 없을 때만 크리스탈 볼 렌더링 (공간 충돌 방지) */}
        {!gachaResults.length && (
          <>
            <div className={`text-8xl relative z-10 drop-shadow-[0_0_30px_rgba(249,199,109,0.5)] transition-all duration-300 ${isSpinning ? 'animate-bounce' : 'hover:scale-110'}`}>
              🔮
            </div>
            <div className="mt-4 text-center z-10">
              <p className="text-[#22d3ee] font-bold text-sm mb-1">이번 주 픽업 🚀</p>
              <p className="text-[#94a3b8] text-xs">최고급 사이버펑크 턴테이블 세트 (확률 UP!)</p>
            </div>
          </>
        )}

        {/* 🚨 가챠 결과 오버레이 창 */}
        {gachaResults.length > 0 && (
          <>
            {/* 배경 블러 이펙트는 absolute로 유지하여 디자인 보존 */}
            <div className="absolute inset-0 bg-[#060b18]/95 backdrop-blur-md z-10" />
            
            {/* 결과물 리스트를 normal flow(relative)로 배치하여 아이템 개수만큼 창 높이가 자동으로 길어지게 통제 */}
            <div className="relative z-20 flex flex-col items-center justify-center w-full px-6">
              <h3 className="text-[#f9c76d] font-black text-xl mb-6 drop-shadow-md">🎉 획득 아이템 🎉</h3>
              
              <div className="grid grid-cols-5 gap-3 w-full max-w-sm">
                {gachaResults.map((item, idx) => {
                  const isHighGrade = item.grade === 'legendary' || item.grade === 'epic';
                  return (
                    <div key={idx} className={`group relative flex flex-col items-center justify-center aspect-square rounded-xl border bg-[#0b0f19] hover:-translate-y-1 transition-transform ${isHighGrade ? 'border-[#f9c76d] shadow-[0_0_15px_rgba(249,199,109,0.2)]' : 'border-white/10'}`}>
                      <span className="text-3xl drop-shadow-md">{item.icon}</span>
                      
                      <div className="absolute -top-8 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-black/90 text-white text-[10px] font-bold px-2.5 py-1 rounded whitespace-nowrap z-30 pointer-events-none border border-white/10 shadow-lg">
                        {item.name}
                      </div>
                    </div>
                  );
                })}
              </div>

              <button onClick={() => setGachaResults([])} className="mt-8 px-8 py-2.5 rounded-full border border-white/20 bg-[#141b2d] text-white text-sm font-bold hover:bg-white/10 hover:border-white/40 transition-colors">
                확인
              </button>
            </div>
          </>
        )}
      </div>


{showError && (
  <div className="absolute inset-0 bg-black/60 z-30 flex items-center justify-center">
    <div className="w-80 rounded-2xl bg-[#141b2d] border border-yellow-400/30 p-6 text-center">

      <div className="text-5xl mb-3">⚠️</div>

      <h2 className="text-xl font-black text-yellow-300 mb-2">
        오류 발생
      </h2>

      <p className="text-gray-300 text-sm mb-6">
        잠시 후 다시 시도해주세요.
      </p>

      <button
        onClick={() => setShowError(false)}
        className="px-6 py-2 rounded-xl bg-yellow-500 hover:bg-yellow-600 text-black font-bold"
      >
        확인
      </button>

    </div>
  </div>
)}


      {showPointWarning && (
  <div className="absolute inset-0 bg-black/60 z-30 flex items-center justify-center">
    <div className="w-80 rounded-2xl bg-[#141b2d] border border-red-400/30 p-6 text-center">
      <div className="text-5xl mb-3">❌</div>

      <h2 className="text-xl font-black text-red-400 mb-2">
        포인트 부족
      </h2>

      <p className="text-gray-300 text-sm mb-6">
        가챠를 돌리기 위한 포인트가 부족합니다.
      </p>

      <button
        onClick={() => setShowPointWarning(false)}
        className="px-6 py-2 rounded-xl bg-red-500 hover:bg-red-600 text-white font-bold"
      >
        확인
      </button>
    </div>
  </div>
)}

{ghostMessage && (
  <div className="absolute inset-0 bg-black/90 backdrop-blur-md z-30 flex flex-col items-center justify-center">
    <div className="text-7xl mb-5">👻</div>

    <h2 className="text-2xl font-black text-red-400 mb-3">
      도박꾼의 영혼 발동!
    </h2>

    <p className="text-gray-300 text-center mb-8">
      모든 획득물을 잃었습니다...
    </p>

    <button
      onClick={() => setGhostMessage(false)}
      className="px-8 py-3 rounded-xl bg-red-500 hover:bg-red-600 text-white font-bold"
    >
      확인
    </button>
  </div>
)}

{/* 🚨 추가: 도박꾼의 영혼 성공 (2배 획득) 전용 시각 이펙트 */}
{ghostWinMessage && (
  <div className="absolute inset-0 bg-[#060b18]/90 backdrop-blur-md z-40 flex flex-col items-center justify-center pointer-events-auto">
    <div className="text-7xl mb-5">🎰</div>

    <h2 className="text-3xl font-black text-[#f9c76d] mb-3 drop-shadow-[0_0_15px_rgba(249,199,109,0.8)] animate-pulse">
      도박꾼의 영혼 발동!
    </h2>

    <p className="text-white text-lg font-bold text-center mb-8">
      잭팟! 획득한 모든 보상이 2배로 복사되었습니다.
    </p>

    <button
      onClick={() => setGhostWinMessage(false)}
      className="px-8 py-3 rounded-xl border border-[#f9c76d] bg-[#141b2d] hover:bg-[#f9c76d] text-[#f9c76d] hover:text-[#060b18] font-bold transition-all shadow-[0_0_15px_rgba(249,199,109,0.3)]"
    >
      결과 확인하기
    </button>
  </div>
)}


      {/* ─── 하단 버튼 영역 ─── */}
      <div className="p-6 bg-[#141b2d] border-t border-[#1e2940] flex gap-4">
        <button 
          onClick={() => handleGacha(1, finalCostSingle)}
          disabled={isSpinning || profile.points < finalCostSingle}
          className="flex-1 py-3 rounded-xl border border-[#f9c76d]/30 bg-[#060b18] text-[#f9c76d] font-bold text-sm hover:bg-[#f9c76d] hover:text-[#060b18] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex flex-col items-center gap-1"
        >
          <span>1회 뽑기</span>
          <span className="text-[10px] flex items-center gap-1"><Star size={10}/> {finalCostSingle} P</span>
        </button>

        <button 
          onClick={() => handleGacha(10, finalCostTen)}
          disabled={isSpinning || profile.points < finalCostTen}
          className="flex-1 py-3 rounded-xl bg-gradient-to-r from-[#f9c76d] to-[#f4a169] text-[#060b18] font-black text-sm shadow-[0_0_20px_rgba(249,199,109,0.4)] hover:scale-[1.02] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex flex-col items-center gap-1"
        >
          <span className="flex items-center gap-1"><Zap size={14}/> 10회 연속 뽑기</span>
          <span className="text-[10px] flex items-center gap-1 opacity-80"><Star size={10}/> {finalCostTen} P</span>
        </button>
      </div>

    </div>
  );
}