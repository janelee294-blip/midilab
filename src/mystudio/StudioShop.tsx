import React, { useState } from 'react';
import { ShoppingCart, X, Star, Guitar, Sofa, Sparkles, Zap } from 'lucide-react';
import type { Profile } from '../../lib/supabase';
import { supabase } from '../lib/supabase';
import { STUDIO_ASSETS } from './studioAssets'; 

type Category = 'furniture' | 'instrument';

export function StudioShop({ profile, onClose, onUpdate }: { profile: Profile, onClose: () => void, onUpdate: () => void }) {
  const [activeTab, setActiveTab] = useState<Category>('furniture');
  const [buyingId, setBuyingId] = useState<string | null>(null);

  const [notification, setNotification] = useState<string | null>(null);
  const notify = (msg: string) => { setNotification(msg); setTimeout(() => setNotification(null), 2000); };

  const filteredItems = STUDIO_ASSETS.filter(item => 
    item.obtain.includes('shop') && item.category === activeTab
  );

  const handleBuy = async (item: typeof STUDIO_ASSETS[0]) => {
    if (profile.points < item.price) {
      notify('❌ 포인트가 부족합니다!');
      return;
    }
    setBuyingId(item.id);

    try {
      const { data } = await supabase.from('profiles').select('inventory').eq('id', profile.id).single();
      
      let currentInv: Record<string, number> = {};
      if (data?.inventory) {
        if (typeof data.inventory === 'string') {
          try { currentInv = JSON.parse(data.inventory); } catch {}
        } else if (typeof data.inventory === 'object' && !Array.isArray(data.inventory)) {
          currentInv = data.inventory as Record<string, number>;
        }
      }

      currentInv[item.id] = (currentInv[item.id] || 0) + 1;

      const { error } = await supabase
        .from('profiles')
        .update({ 
          points: profile.points - item.price,
          inventory: currentInv
        })
        .eq('id', profile.id);

      if (error) throw error;
      notify(`🎉 [${item.name}] 구매 완료! 내 보관함에 저장되었습니다.`);
      onUpdate(); 
    } catch (error) {
      console.error('결제 오류:', error);
      notify('결제 중 오류가 발생했습니다. 다시 시도해주세요.');
    } finally {
      setBuyingId(null);
    }
  };

  return (
    /* 🚨 교정 1: 전체 컨테이너 PC 크기 축소 (max-w-4xl -> max-w-3xl), 모바일 너비 대응 (w-[95vw] md:w-full) */
    <div className="w-[95vw] md:w-full max-w-4xl bg-[#060b18] border border-[#1e2940] rounded-2xl shadow-[0_0_60px_rgba(0,0,0,0.9)] relative pointer-events-auto flex flex-col h-[85vh] md:h-[80vh] overflow-hidden">
      
       {notification && (
        <div className="absolute top-10 left-1/2 -translate-x-1/2 z-[100] bg-[#22d3ee]/20 border border-[#22d3ee]/50 text-white px-4 py-2 md:px-6 md:py-3 text-sm md:text-base rounded-full backdrop-blur-md shadow-2xl whitespace-nowrap">
          {notification}
        </div>
      )}

      {/* ─── 1. 스토어 헤더 ─── */}
      {/* 🚨 교정 2: 모바일 패딩 축소 및 텍스트 강제 줄바꿈 방지 */}
      <div className="relative p-4 md:px-6 md:py-5 bg-gradient-to-r from-[#0b0f19] to-[#060b18] flex items-center justify-between border-b border-[#1e2940]">
        <div className="absolute top-0 left-0 w-32 md:w-64 h-full bg-gradient-to-r from-[#22d3ee]/10 to-transparent pointer-events-none" />
        
        <div className="flex items-center gap-3 md:gap-4 relative z-10">
          <div className="w-10 h-10 md:w-12 md:h-12 shrink-0 rounded-xl md:rounded-2xl bg-[#0b0f19] flex items-center justify-center border border-[#22d3ee]/30 shadow-[0_0_20px_rgba(34,211,238,0.2)]">
            <ShoppingCart className="text-[#22d3ee] w-5 h-5 md:w-6 md:h-6" />
          </div>
          <div>
            <h2 className="text-lg md:text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white to-[#94a3b8] tracking-widest uppercase leading-tight">
              Studio Shop
            </h2>
            <p className="text-[10px] md:text-xs text-[#22d3ee] font-medium tracking-wide mt-0.5 flex items-center gap-1 hidden sm:flex">
              <Sparkles size={12} /> 포인트로 공간을 커스텀하세요
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 md:gap-4 relative z-10">
          <div className="flex items-center gap-1.5 md:gap-3 bg-[#060b18] px-3 py-1.5 md:px-4 md:py-2 rounded-lg md:rounded-xl border border-[#1e2940] shadow-inner">
            <span className="hidden md:block text-xs text-[#64748b] font-bold">보유 포인트</span>
            <div className="hidden md:block h-3 w-px bg-[#1e2940]" />
            <div className="flex items-center gap-1">
              <Star size={14} className="text-[#f9c76d]" />
              <span className="font-bold text-[#f9c76d] text-base md:text-lg tracking-wider">{profile.points.toLocaleString()}</span>
            </div>
          </div>
          <button onClick={onClose} className="p-2 md:p-2.5 rounded-lg md:rounded-xl text-[#64748b] bg-[#0b0f19] border border-[#1e2940] hover:text-white hover:bg-[#1e2940] hover:border-[#334155] transition-all">
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* ─── 2. 탭 영역 ─── */}
      {/* 🚨 교정 3: 모바일에서 버튼이 50:50으로 정확히 분할되도록 flex-1 부여 */}
      <div className="px-4 md:px-6 pt-4 md:pt-5 bg-[#060b18] flex gap-1 md:gap-2 border-b border-[#1e2940]">
        <button
          onClick={() => setActiveTab('furniture')}
          className={`relative flex-1 md:flex-none justify-center px-4 py-3 md:px-8 md:py-3.5 rounded-t-xl font-bold transition-all text-xs md:text-sm flex items-center gap-1.5 md:gap-2 border-t border-l border-r -mb-[1px] whitespace-nowrap
            ${activeTab === 'furniture'
              ? 'bg-[#0b0f19] text-[#22d3ee] border-[#1e2940] border-b-[#0b0f19] z-10'
              : 'bg-transparent text-[#64748b] border-transparent hover:bg-[#0b0f19]/50 hover:text-[#94a3b8] z-0'
            }`}
        >
          <Sofa size={16} className="md:w-[18px] md:h-[18px]" /> 인테리어 가구
        </button>

        <button
          onClick={() => setActiveTab('instrument')}
          className={`relative flex-1 md:flex-none justify-center px-4 py-3 md:px-8 md:py-3.5 rounded-t-xl font-bold transition-all text-xs md:text-sm flex items-center gap-1.5 md:gap-2 border-t border-l border-r -mb-[1px] whitespace-nowrap
            ${activeTab === 'instrument'
              ? 'bg-[#0b0f19] text-[#22d3ee] border-[#1e2940] border-b-[#0b0f19] z-10'
              : 'bg-transparent text-[#64748b] border-transparent hover:bg-[#0b0f19]/50 hover:text-[#94a3b8] z-0'
            }`}
        >
          <Guitar size={16} className="md:w-[18px] md:h-[18px]" /> 악기 & 장비
        </button>
      </div>

      {/* ─── 3. 본문 리스트 ─── */}
      {/* 🚨 교정 4: 리스트 내부 요소(아이콘, 텍스트, 버튼)의 모바일/PC 볼륨(Volume) 비례 축소 */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6 scrollbar-hide bg-[#0b0f19] relative z-0">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-5">
          {filteredItems.map((item) => {
            const canAfford = profile.points >= item.price;
            const isBuying = buyingId === item.id;

            let gradeStyle = '';
            let badgeStyle = '';
            let gradeName = '';

            switch (item.grade) {
              case 'legendary': 
                gradeStyle = 'border-amber-400/40 hover:border-amber-400/80 hover:shadow-[0_0_30px_rgba(251,191,36,0.2)]'; 
                badgeStyle = 'bg-gradient-to-br from-amber-900 to-amber-700 border-amber-500/50 text-amber-300 shadow-[0_0_10px_rgba(251,191,36,0.3)]';
                gradeName = 'LEGENDARY';
                break;
              case 'epic': 
                gradeStyle = 'border-purple-500/40 hover:border-purple-500/80 hover:shadow-[0_0_30px_rgba(168,85,247,0.2)]'; 
                badgeStyle = 'bg-gradient-to-br from-purple-900 to-purple-700 border-purple-500/50 text-purple-300 shadow-[0_0_10px_rgba(168,85,247,0.3)]';
                gradeName = 'EPIC';
                break;
              case 'rare': 
                gradeStyle = 'border-blue-500/40 hover:border-blue-500/80 hover:shadow-[0_0_30px_rgba(59,130,246,0.2)]'; 
                badgeStyle = 'bg-gradient-to-br from-blue-900 to-blue-700 border-blue-500/50 text-blue-300 shadow-[0_0_10px_rgba(59,130,246,0.3)]';
                gradeName = 'RARE';
                break;
              default: 
                gradeStyle = 'border-[#1e2940] hover:border-[#94a3b8]/50 hover:shadow-[0_0_30px_rgba(148,163,184,0.1)]'; 
                badgeStyle = 'bg-gradient-to-br from-slate-800 to-slate-700 border-slate-500/50 text-slate-300';
                gradeName = 'COMMON';
                break;
            }

            return (
              <div key={item.id} className={`group relative flex flex-col bg-[#141b2d] border rounded-xl md:rounded-2xl overflow-hidden transition-all duration-300 transform hover:-translate-y-1.5 ${gradeStyle}`}>
                
                <div className="absolute top-2 left-2 md:top-3 md:left-3 z-30">
                  <span className={`px-2 py-0.5 md:px-2.5 md:py-1 rounded text-[8px] md:text-[9px] font-black tracking-widest border ${badgeStyle}`}>
                    {gradeName}
                  </span>
                </div>

                <div className="w-full h-28 md:h-36 bg-[#060b18] flex items-center justify-center relative overflow-hidden border-b border-[#1e2940]">
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.08)_0%,transparent_70%)] transition-colors duration-500" />
                  <div className="text-5xl md:text-6xl z-10 group-hover:scale-110 transition-transform duration-500 drop-shadow-2xl">
                    {item.icon}
                  </div>
                </div>

                <div className="p-3 md:p-5 flex flex-col flex-1 relative z-20 bg-gradient-to-b from-[#141b2d] to-[#0b0f19]">
                  <h3 className="text-white font-bold text-sm md:text-base mb-1 md:mb-1.5">{item.name}</h3>
                  <p className="text-[10px] md:text-xs text-[#64748b] line-clamp-2 mb-3 md:mb-5 flex-1 leading-snug md:leading-relaxed">{item.description}</p>
                  
                  <button 
                    onClick={() => handleBuy(item)}
                    disabled={isBuying || !canAfford}
                    className={`relative w-full h-9 md:h-11 rounded-lg md:rounded-xl text-xs md:text-sm font-black transition-all duration-300 flex items-center justify-center gap-1.5 md:gap-2 overflow-hidden
                      ${!canAfford 
                        ? 'bg-[#1e2940] text-[#475569] cursor-not-allowed' 
                        : isBuying
                        ? 'bg-[#f9c76d] text-[#060b18]'
                        : 'bg-[#1a233a] text-[#f9c76d] border border-[#f9c76d]/30 hover:bg-[#f9c76d] hover:text-[#060b18] hover:shadow-[0_0_20px_rgba(249,199,109,0.4)]'
                      }`}
                  >
                    {isBuying ? (
                      <span className="animate-pulse flex items-center gap-1.5 md:gap-2">
                        <Zap size={14} className="md:w-4 md:h-4" /> 진행중
                      </span>
                    ) : (
                      <>
                        <Star size={12} className={`md:w-3.5 md:h-3.5 ${!canAfford ? 'text-[#475569]' : (isBuying ? 'text-[#060b18]' : 'text-[#f9c76d]')}`} /> 
                        {item.price.toLocaleString()} P
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}