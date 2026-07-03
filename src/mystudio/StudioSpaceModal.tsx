import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase'; // 경로 확인 필요

export function StudioSpaceModal({ onClose, onSelectSpace }: any) {
  const [spaces, setSpaces] = useState<any[]>([]);

  useEffect(() => {
    async function fetchSpaces() {
      // 🚨 실제 테이블명(studios)과 구조에 맞춰 수정 필요
      const { data } = await supabase.from('studios').select('*').eq('is_unlocked', true);
      setSpaces(data || []);
    }
    fetchSpaces();
  }, []);

  return (
    <div className="fixed inset-0 z-[110] bg-black/80 flex items-center justify-center p-4">
      <div className="bg-[#0b0f19] border border-[#1e2940] rounded-2xl w-full max-w-md p-6">
        <h3 className="text-white font-bold mb-4">공간 선택</h3>
        <div className="space-y-3">
          {spaces.map(s => (
            <button key={s.id} onClick={() => onSelectSpace(s.layout_data)} className="w-full p-4 bg-[#141b2d] rounded-xl border border-[#1e2940] text-white hover:border-[#22d3ee]">
              {s.space_name}
            </button>
          ))}
        </div>
        <button onClick={onClose} className="mt-6 w-full py-2 text-slate-500">닫기</button>
      </div>
    </div>
  );
}