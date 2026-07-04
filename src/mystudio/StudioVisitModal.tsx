import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase'; // 🚨 상대 경로가 맞는지 확인 필요 (보통 '../../lib/supabase' 일 수 있음)
import { DoorOpen, Search, X, User } from 'lucide-react';

export function StudioVisitModal({ onClose, onVisit, currentUserId }: {
  onClose: () => void;
  onVisit: (studentId: string) => void;
  currentUserId?: string;
}) {
  const [students, setStudents] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    async function fetchStudents() {
      setIsLoading(true);
      // profiles 테이블에서 학생 역할인 유저를 추출
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, studio_name')
        .eq('role', 'student')
        .order('full_name', { ascending: true });
      
      if (!error && data) {
        setStudents(data.filter(student => student.id !== currentUserId));
      }
      setIsLoading(false);
    }
    fetchStudents();
  }, [currentUserId]);

  const getStudioDisplayName = (student: any) =>
    student.studio_name?.trim() || `${student.full_name}의 작업실`;

  const filteredStudents = students.filter(student => {
    const studioDisplayName = getStudioDisplayName(student);
    return student.full_name?.includes(searchTerm) || studioDisplayName.includes(searchTerm);
  });

  return (
    <div className="fixed inset-0 z-[120] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 pointer-events-auto">
      <div className="bg-[#0b101e]/95 border border-[#1e2940] rounded-2xl w-full max-w-lg shadow-2xl flex flex-col h-[75vh] max-h-[600px] animate-in zoom-in-95 duration-200">
        
        {/* ─── 헤더 영역 ─── */}
        <div className="flex items-center justify-between p-5 border-b border-white/10 shrink-0">
          <h3 className="text-white font-bold flex items-center gap-2">
            <DoorOpen size={18} className="text-[#22d3ee]" />
            다른 작업실 방문
          </h3>
          <button onClick={onClose} className="text-white/50 hover:text-white transition-colors p-1">
            <X size={20} />
          </button>
        </div>

        {/* ─── 검색 영역 ─── */}
        <div className="p-4 shrink-0">
          <div className="relative">
            <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40" />
            <input 
              type="text" 
              placeholder="학생 이름 또는 스튜디오 검색..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-[#141b2d] border border-white/10 rounded-xl py-3 pl-10 pr-4 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-[#22d3ee]/50 transition-colors"
            />
          </div>
        </div>

        {/* ─── 리스트 출력 영역 ─── */}
        <div className="flex-1 overflow-y-auto p-4 pt-0 space-y-2 custom-scrollbar">
          {isLoading ? (
            <div className="h-full flex items-center justify-center text-white/50 text-sm">
              데이터를 불러오는 중...
            </div>
          ) : filteredStudents.length === 0 ? (
            <div className="h-full flex items-center justify-center text-white/50 text-sm">
              검색 결과가 없습니다.
            </div>
          ) : (
            filteredStudents.map(student => (
              <button 
                key={student.id} 
                onClick={() => onVisit(student.id)}
                className="w-full p-4 bg-[#141b2d]/50 rounded-xl border border-[#1e2940] flex items-center justify-between group hover:bg-[#1e2940]/50 hover:border-[#22d3ee]/50 transition-all"
              >
                <div className="flex items-center gap-4 text-left">
                  <div className="w-10 h-10 rounded-full bg-[#060b18] border border-white/10 flex items-center justify-center text-white/50 group-hover:text-[#22d3ee] transition-colors shrink-0">
                    <User size={18} />
                  </div>
                  <div>
                    <p className="font-bold text-white/90 text-sm group-hover:text-white transition-colors">
                      {getStudioDisplayName(student)}
                    </p>
                    <p className="text-xs text-white/40 mt-0.5">
                      {student.full_name} 학생
                    </p>
                  </div>
                </div>
                <div className="opacity-0 group-hover:opacity-100 text-[#22d3ee] text-xs font-bold tracking-widest transition-opacity pr-2">
                  방문하기 ➔
                </div>
              </button>
            ))
          )}
        </div>

      </div>
    </div>
  );
}
