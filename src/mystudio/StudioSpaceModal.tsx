import { CheckCircle2, Lock } from 'lucide-react';

const STUDIO_SPACES = [
  { id: 'room_lv1', name: '기본 작업실', isDefault: true },
  { id: 'room_lv2', name: '루키 스튜디오', isDefault: false },
  { id: 'room_lv3', name: '그루브 스튜디오', isDefault: false },
  { id: 'room_lv4', name: '프로듀서 룸', isDefault: false },
  { id: 'room_lv5', name: '시그니처 스튜디오', isDefault: false },
] as const;

interface StudioSpaceModalProps {
  unlockedRooms: string[];
  onClose: () => void;
}

export function StudioSpaceModal({ unlockedRooms, onClose }: StudioSpaceModalProps) {
  return (
    <div className="fixed inset-0 z-[110] bg-black/80 flex items-center justify-center p-4">
      <div className="bg-[#0b0f19] border border-[#1e2940] rounded-2xl w-full max-w-md p-6">
        <h3 className="text-white font-bold mb-1">공간 선택 / 관리</h3>
        <p className="text-xs text-slate-500 mb-4">해금된 작업실 공간을 확인할 수 있습니다.</p>

        <div className="space-y-3">
          {STUDIO_SPACES.map(space => {
            const isUnlocked = space.isDefault || unlockedRooms.includes(space.id);

            return (
              <button
                key={space.id}
                type="button"
                disabled={!isUnlocked}
                onClick={() => console.log('Studio space preview:', space.id)}
                className={`w-full p-4 rounded-xl border text-left transition-colors ${
                  isUnlocked
                    ? 'bg-[#141b2d] border-[#1e2940] hover:border-[#22d3ee]'
                    : 'bg-[#101624] border-[#1e2940]/60 cursor-not-allowed opacity-55'
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-white truncate">{space.name}</p>
                    <p className="text-[10px] text-slate-500 mt-1">{space.id}</p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {space.isDefault && (
                      <span className="rounded-full border border-amber-400/30 bg-amber-400/10 px-2 py-1 text-[10px] font-bold text-amber-300">
                        기본 해금
                      </span>
                    )}
                    <span className={`flex items-center gap-1 text-[10px] font-bold ${
                      isUnlocked ? 'text-emerald-400' : 'text-slate-500'
                    }`}>
                      {isUnlocked ? <CheckCircle2 size={13} /> : <Lock size={13} />}
                      {isUnlocked ? '사용 가능' : '잠김'}
                    </span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        <button onClick={onClose} className="mt-6 w-full py-2 text-slate-500 hover:text-slate-300 transition-colors">
          닫기
        </button>
      </div>
    </div>
  );
}
