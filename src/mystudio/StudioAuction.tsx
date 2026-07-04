import { Store, X, ShieldCheck, Package, Sparkles, Gavel, ShoppingCart } from 'lucide-react';

const UPCOMING_FEATURES = [
  {
    title: '아이템 판매',
    description: '보유 아이템을 거래소에 등록합니다.',
    icon: Package,
  },
  {
    title: '아이템 구매',
    description: '다른 학생의 아이템을 포인트로 구매합니다.',
    icon: ShoppingCart,
  },
];

export function StudioAuction({ onClose }: { onClose: () => void }) {
  return (
    <div className="w-[calc(100vw-1rem)] sm:w-full max-w-4xl bg-[#060b18] border border-[#1e2940] rounded-xl sm:rounded-2xl shadow-[0_0_60px_rgba(0,0,0,0.9)] relative pointer-events-auto flex flex-col h-[calc(100dvh-140px)] max-h-[calc(100dvh-140px)] sm:h-[78vh] sm:max-h-[78vh] md:h-[72vh] md:max-h-[720px] lg:h-[75vh] overflow-hidden">
      <div className="relative shrink-0 px-4 py-3.5 sm:px-6 sm:py-4 md:px-8 md:py-5 bg-gradient-to-r from-[#141b2d] to-[#060b18] flex items-center justify-between gap-3 border-b border-[#1e2940]">
        <div className="flex min-w-0 flex-1 items-center gap-3 md:gap-4 relative z-10">
          <div className="w-10 h-10 md:w-12 md:h-12 shrink-0 rounded-xl md:rounded-2xl bg-[#0b0f19] flex items-center justify-center border border-[#a78bfa]/30 shadow-[0_0_20px_rgba(167,139,250,0.2)]">
            <Store className="w-5 h-5 md:w-6 md:h-6 text-[#a78bfa]" />
          </div>
          <div className="min-w-0">
            <h2 className="text-lg sm:text-xl md:text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white to-[#94a3b8] tracking-[0.14em] sm:tracking-widest uppercase whitespace-nowrap">
              USER MARKET
            </h2>
            <p className="max-w-[220px] sm:max-w-none text-[10px] sm:text-xs leading-4 text-[#a78bfa] font-medium tracking-wide mt-0.5 sm:mt-1">
              유저 간 아이템 거래소는 준비 중입니다
            </p>
          </div>
        </div>

        <button
          onClick={onClose}
          className="w-10 h-10 md:w-auto md:h-auto md:p-2.5 shrink-0 rounded-xl text-[#64748b] bg-[#0b0f19] hover:text-white transition-all border border-[#1e2940] flex items-center justify-center"
          aria-label="거래소 닫기"
        >
          <X className="w-[18px] h-[18px] md:w-5 md:h-5" />
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto md:overflow-hidden overscroll-contain scrollbar-hide p-2.5 sm:p-4 md:p-6 bg-[#0b0f19]">
        <div className="mx-auto flex w-full max-w-3xl flex-col justify-start md:h-full md:justify-center gap-2.5 sm:gap-3 md:gap-4">
          <div className="relative overflow-hidden rounded-2xl md:rounded-3xl border border-[#1e2940] bg-[#141b2d] px-4 py-4 sm:px-6 sm:py-5 md:px-8 md:py-7 text-center shadow-[0_0_40px_rgba(167,139,250,0.1)]">
            <div className="pointer-events-none absolute -top-20 left-1/2 h-44 w-44 md:-top-24 md:h-56 md:w-56 -translate-x-1/2 rounded-full bg-[#a78bfa]/10 blur-3xl" />
            <div className="pointer-events-none absolute inset-x-8 sm:inset-x-16 top-0 h-px bg-gradient-to-r from-transparent via-[#a78bfa]/60 to-transparent" />

            <div className="relative mx-auto mb-3 md:mb-4 w-14 h-14 md:w-16 md:h-16 rounded-2xl border border-[#a78bfa]/35 bg-[#060b18] flex items-center justify-center shadow-[0_0_35px_rgba(167,139,250,0.22)]">
              <Gavel className="w-6 h-6 md:w-7 md:h-7 text-[#a78bfa] drop-shadow-[0_0_10px_rgba(167,139,250,0.65)]" />
            </div>

            <div className="relative inline-flex items-center gap-1.5 rounded-full border border-[#a78bfa]/25 bg-[#a78bfa]/10 px-2.5 py-1 text-[9px] md:text-[10px] font-black tracking-[0.18em] md:tracking-[0.2em] text-[#a78bfa]">
              <Sparkles className="w-2.5 h-2.5 md:w-[11px] md:h-[11px]" />
              COMING SOON
            </div>

            <h3 className="relative mt-2.5 md:mt-3 text-lg sm:text-xl md:text-2xl font-black text-white">
              거래소 준비 중
            </h3>
            <p className="relative mx-auto mt-2 max-w-md text-[11px] sm:text-xs md:text-sm leading-4 sm:leading-5 text-[#94a3b8]">
              아이템 거래는 포인트/인벤토리 보안 안정화 후 오픈될 예정입니다.
            </p>

            <div className="relative mx-auto mt-3 md:mt-4 max-w-lg rounded-xl md:rounded-2xl border border-[#1e2940] bg-[#060b18]/75 px-3 py-2.5 sm:px-4 sm:py-3">
              <div className="flex items-center justify-center gap-2 text-[#cbd5e1]">
                <ShieldCheck className="w-3.5 h-3.5 md:w-4 md:h-4 shrink-0 text-[#a78bfa]" />
                <p className="text-[11px] sm:text-xs md:text-sm leading-4 sm:leading-5 font-medium">
                  현재는 작업실 꾸미기, 상점, 뽑기 기능을 먼저 이용해주세요.
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-2 sm:gap-3 md:grid-cols-2">
            {UPCOMING_FEATURES.map(({ title, description, icon: Icon }) => (
              <div
                key={title}
                className="rounded-xl md:rounded-2xl border border-[#1e2940] bg-[#141b2d]/80 px-3 py-2.5 sm:px-4 sm:py-3 opacity-80 shadow-[0_8px_24px_rgba(0,0,0,0.18)]"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex h-9 w-9 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-lg sm:rounded-xl border border-[#a78bfa]/20 bg-[#060b18]">
                    <Icon className="w-4 h-4 sm:w-[18px] sm:h-[18px] text-[#a78bfa]" />
                  </div>
                  <span className="rounded-full border border-[#a78bfa]/20 bg-[#a78bfa]/10 px-2 py-0.5 text-[9px] font-bold tracking-wider text-[#a78bfa]">
                    준비 중
                  </span>
                </div>
                <h4 className="mt-2 sm:mt-2.5 text-sm font-bold text-white/90">{title}</h4>
                <p className="mt-1 text-[11px] sm:text-xs leading-4 sm:leading-5 text-[#64748b]">{description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
