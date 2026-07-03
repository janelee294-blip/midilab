import React, { useState } from 'react';
import { Gavel, X, Star, Clock, Flame, AlertCircle, PlusCircle } from 'lucide-react';
import type { Profile } from '../../lib/supabase';

const MOCK_AUCTIONS = [
  { id: 'auc_1', itemName: '시그니처 그랜드 피아노', seller: '김학생', currentBid: 5500, timeLeft: '02:14:30', image: '🎹', isHot: true },
  { id: 'auc_2', itemName: '초한정판 골드 기타', seller: '이수강', currentBid: 3200, timeLeft: '00:45:12', image: '🎸', isHot: false },
  { id: 'auc_3', itemName: '빈티지 진공관 앰프', seller: '박작곡', currentBid: 1800, timeLeft: '12:05:00', image: '📻', isHot: false },
];

export function StudioAuction({ profile, onClose }: { profile: Profile, onClose: () => void }) {
  const [biddingId, setBiddingId] = useState<string | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [bidModal, setBidModal] = useState<{ isOpen: boolean, auction: any, minBid: number }>({ isOpen: false, auction: null, minBid: 0 });
  const [bidInput, setBidInput] = useState<string>('');

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 2500);
  };

  const handleBidClick = (auction: typeof MOCK_AUCTIONS[0]) => {
    const minBid = auction.currentBid + 100; 
    if (profile.points < minBid) {
      showToast(`포인트가 부족합니다. (최소 ${minBid.toLocaleString()} P 필요)`);
      return;
    }
    setBidInput(minBid.toString());
    setBidModal({ isOpen: true, auction, minBid });
  };

  const submitBid = () => {
    const amount = parseInt(bidInput);
    if (isNaN(amount) || amount < bidModal.minBid) {
      showToast(`최소 입찰가(${bidModal.minBid.toLocaleString()} P) 이상을 입력해주세요.`);
      return;
    }
    setBidModal({ isOpen: false, auction: null, minBid: 0 });
    setBiddingId(bidModal.auction.id);
    setTimeout(() => {
      showToast(`🎉 ${amount.toLocaleString()} P 입찰 성공! 최고 입찰자가 되었습니다.`);
      setBiddingId(null);
    }, 800);
  };

  return (
    <div className="w-full max-w-4xl bg-[#060b18] border border-[#1e2940] rounded-2xl shadow-[0_0_60px_rgba(0,0,0,0.9)] relative pointer-events-auto flex flex-col h-[75vh] overflow-hidden">
      
      {/* 알림 토스트 & 입찰 모달 (기존과 동일) */}
      {toastMsg && (
        <div className="absolute top-6 left-1/2 -translate-x-1/2 z-[60] bg-[#1e2940]/95 backdrop-blur-md border border-[#334155] text-white px-5 py-3 rounded-xl flex items-center gap-2 shadow-2xl">
          <AlertCircle size={16} className="text-[#a78bfa]" />
          <span className="text-sm font-bold tracking-wide">{toastMsg}</span>
        </div>
      )}

      {bidModal.isOpen && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-[#0b0f19] border border-[#1e2940] p-6 rounded-2xl w-80 shadow-[0_0_40px_rgba(167,139,250,0.15)] flex flex-col gap-5">
            <div>
              <h3 className="text-white font-bold text-lg flex items-center gap-2"><Gavel size={18} className="text-[#a78bfa]"/> 입찰하기</h3>
              <p className="text-xs text-[#64748b] mt-1.5">[{bidModal.auction?.itemName}]</p>
            </div>
            <div>
              <label className="text-[10px] text-[#94a3b8] font-bold mb-1.5 block">입찰 금액 (최소 {bidModal.minBid.toLocaleString()} P)</label>
              <div className="relative">
                <input 
                  type="number" value={bidInput} onChange={(e) => setBidInput(e.target.value)}
                  className="w-full bg-[#141b2d] border border-[#1e2940] text-white rounded-lg px-4 py-2.5 outline-none focus:border-[#a78bfa] font-bold tracking-wide" autoFocus
                />
                <Star size={14} className="absolute right-3 top-3 text-[#f9c76d]" />
              </div>
            </div>
            <div className="flex gap-3 mt-2">
              <button onClick={() => setBidModal({ isOpen: false, auction: null, minBid: 0 })} className="flex-1 py-2.5 rounded-xl text-xs font-bold bg-[#141b2d] text-[#64748b] hover:text-white transition-colors">취소</button>
              <button onClick={submitBid} className="flex-1 py-2.5 rounded-xl text-xs font-black bg-[#a78bfa] text-[#060b18] hover:bg-[#8b5cf6] transition-colors">입찰 확정</button>
            </div>
          </div>
        </div>
      )}

      {/* ─── 헤더 (출품하기 버튼 추가됨) ─── */}
      <div className="relative px-8 py-6 bg-gradient-to-r from-[#141b2d] to-[#060b18] flex items-center justify-between border-b border-[#1e2940]">
        <div className="flex items-center gap-4 relative z-10">
          <div className="w-12 h-12 rounded-2xl bg-[#0b0f19] flex items-center justify-center border border-[#a78bfa]/30 shadow-[0_0_20px_rgba(167,139,250,0.2)]">
            <Gavel size={24} className="text-[#a78bfa]" />
          </div>
          <div>
            <h2 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white to-[#94a3b8] tracking-widest uppercase">USER AUCTION</h2>
            <p className="text-xs text-[#a78bfa] font-medium tracking-wide mt-1">유저 간 한정판 아이템 경매장</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* 🚨 새로 추가된 [내 아이템 출품하기] 버튼 */}
          <button 
            onClick={() => showToast("아이템 출품 기능은 인벤토리 시스템과 연동될 예정입니다!")}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#a78bfa]/10 text-[#a78bfa] border border-[#a78bfa]/30 hover:bg-[#a78bfa] hover:text-[#060b18] transition-all text-xs font-bold"
          >
            <PlusCircle size={14} /> 내 아이템 출품
          </button>
          
          <div className="h-6 w-px bg-[#1e2940]" />

          <button onClick={onClose} className="p-2.5 rounded-xl text-[#64748b] bg-[#0b0f19] hover:text-white transition-all border border-[#1e2940]">
            <X size={20} />
          </button>
        </div>
      </div>

      {/* 경매 리스트 (기존 동일) */}
      <div className="flex-1 overflow-y-auto p-8 bg-[#0b0f19]">
        <div className="space-y-4">
          {MOCK_AUCTIONS.map((auction) => (
            <div key={auction.id} className="flex items-center bg-[#141b2d] border border-[#1e2940] rounded-2xl p-4 hover:border-[#a78bfa]/50 hover:shadow-[0_0_15px_rgba(167,139,250,0.1)] transition-all">
              <div className="w-20 h-20 bg-[#060b18] rounded-xl flex items-center justify-center text-4xl mr-5 border border-[#1e2940] relative">
                {auction.isHot && <div className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 animate-pulse shadow-lg"><Flame size={12} /></div>}
                {auction.image}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1.5"><span className="bg-[#1e2940] text-[#a78bfa] px-2 py-0.5 rounded text-[10px] font-bold tracking-wider">출품자: {auction.seller}</span></div>
                <h3 className="text-white font-bold text-base">{auction.itemName}</h3>
                <div className="flex items-center gap-4 mt-2"><p className="text-xs font-medium text-red-400 flex items-center gap-1"><Clock size={12} /> 마감까지 {auction.timeLeft}</p></div>
              </div>
              <div className="flex flex-col items-end gap-2 border-l border-[#1e2940] pl-6 ml-4">
                <div className="text-right">
                  <p className="text-[10px] text-[#64748b] font-bold mb-0.5">현재 최고 입찰가</p>
                  <p className="text-[#f9c76d] font-black text-xl flex items-center justify-end gap-1"><Star size={16} /> {auction.currentBid.toLocaleString()}</p>
                </div>
                <button onClick={() => handleBidClick(auction)} disabled={biddingId === auction.id} className={`px-6 py-2.5 rounded-lg text-xs font-bold transition-all w-28 ${biddingId === auction.id ? 'bg-[#a78bfa] text-[#060b18]' : 'bg-transparent border border-[#a78bfa] text-[#a78bfa] hover:bg-[#a78bfa] hover:text-[#060b18]'}`}>
                  {biddingId === auction.id ? '처리 중...' : '입찰하기'}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}