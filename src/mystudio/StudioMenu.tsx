import React, { useState } from 'react';
import { Menu, X, Users, LayoutGrid } from 'lucide-react';
import { StudioVisitModal } from './StudioVisitModal'; // 같은 폴더이므로 ./ 사용
import { StudioSpaceModal } from './StudioSpaceModal.tsx'; // 같은 폴더이므로 ./ 사용

export function StudioMenu({ sendToGodot }: { sendToGodot: (type: string, data?: any) => void }) {
  const [isOpen, setIsOpen] = useState(false);
  const [modalType, setModalType] = useState<'space' | 'visit' | null>(null);

  return (
    <>
      {/* 이 컴포넌트가 MyStudio.tsx에 삽입될 때, 가장 먼저 화면에 보이는 '물리적 버튼' */}
      <button onClick={() => setIsOpen(true)} title="메뉴"
        className="w-7 h-7 md:w-8 md:h-8 rounded-lg flex items-center justify-center transition-all shrink-0 shadow-lg pointer-events-auto"
        style={{ background:'rgba(10,6,20,.55)', border:'1px solid rgba(255,255,255,.08)', color:'rgba(255,255,255,.6)', backdropFilter:'blur(8px)' }}
        onMouseEnter={e=>(e.currentTarget.style.color='rgba(255,255,255,.95)')} onMouseLeave={e=>(e.currentTarget.style.color='rgba(255,255,255,.6)')}>
        <Menu size={14}/>
      </button>

      {/* 버튼이 눌리면(isOpen === true) 현재 레이어 위에 덮어씌워지는 메뉴 오버레이 */}
      {isOpen && (
        <div className="fixed inset-0 z-[110] bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center animate-in fade-in duration-200 pointer-events-auto">
          <button onClick={() => setIsOpen(false)} className="absolute top-6 right-6 text-white p-2">
            <X size={32} />
          </button>

          <div className="flex flex-col gap-4 w-full max-w-sm px-6">
            <h2 className="text-xl font-black text-white text-center mb-2 tracking-wider">STUDIO MENU</h2>
            
            <button onClick={() => { setModalType('visit'); setIsOpen(false); }} className="flex items-center gap-4 p-4 bg-[#0b101e] border border-[#1e2940] rounded-2xl hover:border-[#22d3ee] transition-all w-full shadow-lg group">
              <div className="text-[#22d3ee] group-hover:scale-110 transition-transform"><Users size={24} /></div>
              <div className="text-left">
                <p className="font-bold text-white text-sm">작업실 구경하기</p>
                <p className="text-[10px] text-white/50 mt-1">다른 학생들의 작업실을 구경합니다</p>
              </div>
            </button>

            <button onClick={() => { setModalType('space'); setIsOpen(false); }} className="flex items-center gap-4 p-4 bg-[#0b101e] border border-[#1e2940] rounded-2xl hover:border-[#22d3ee] transition-all w-full shadow-lg group">
              <div className="text-[#22d3ee] group-hover:scale-110 transition-transform"><LayoutGrid size={24} /></div>
              <div className="text-left">
                <p className="font-bold text-white text-sm">공간 선택 / 관리</p>
                <p className="text-[10px] text-white/50 mt-1">보유한 작업실 공간을 이동합니다</p>
              </div>
            </button>
          </div>
        </div>
      )}

      {/* 모달 출력부 */}
      {modalType === 'visit' && (
        <StudioVisitModal 
          onClose={() => setModalType(null)} 
          onVisit={(studentId: string) => {
            sendToGodot('VISIT_STUDIO', { studentId });
            setModalType(null);
          }} 
        />
      )}

      {modalType === 'space' && (
        <StudioSpaceModal 
          onClose={() => setModalType(null)} 
          onSelectSpace={(layoutData: any) => {
            sendToGodot('LOAD_LAYOUT', { room_layout: layoutData });
            setModalType(null);
          }} 
        />
      )}
    </>
  );
}