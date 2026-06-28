import React, { useState, useEffect } from 'react';
import {
  Music, Calendar, BookOpen, Gamepad2, Trophy, LogOut, Settings,
  Ticket, Star, AlertCircle, User, CalendarClock,
  ShoppingBag, RotateCcw, ChevronRight,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { Logo } from '../components/shared/Logo';
import { ReservationCalendar } from '../components/student/ReservationCalendar';
import { VideoLibrary } from '../components/student/VideoLibrary';
import { GameLobby, GAMES } from '../games';
import { RankingBoard } from '../components/student/RankingBoard';
import { MyStudio } from '../components/student/MyStudio';
import { ExtensionRequest } from '../components/student/ExtensionRequest';
import { RegistrationRequest } from '../components/student/RegistrationRequest';
import { RefundRequest } from '../components/student/RefundRequest';
import { PasswordChange } from '../components/shared/PasswordChange';
import { Modal } from '../components/ui/Modal';

type Tab = 'home' | 'calendar' | 'library' | 'game' | 'ranking' | 'settings';

const TASK_DISCOUNT = 20000;

export function StudentDashboard() {
  const { profile, signOut, refreshProfile } = useAuth();
  const [tab, setTab] = useState<Tab>('home');
  const [selectedGameId, setSelectedGameId] = useState<string | null>(null);
  const [activeModal, setActiveModal] = useState<'registration' | 'refund' | 'extension' | null>(null);
  const [futureBookings, setFutureBookings] = useState(0);
  const [nextMonthDiscount, setNextMonthDiscount] = useState(0);

  useEffect(() => {
    if (!profile?.id) return;
    const d = new Date();
    const todayStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    supabase
      .from('reservations')
      .select('id, time_slots(slot_date)')
      .eq('user_id', profile.id)
      .eq('status', 'confirmed')
      .then(({ data }) => {
        const count = (data || []).filter(
          r => (r.time_slots as any)?.slot_date >= todayStr
        ).length;
        setFutureBookings(count);
      });

    supabase
      .from('task_assignments')
      .select('task_1, task_2, task_3, task_4, extra_discount')
      .eq('student_id', profile.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          const tasks = [data.task_1, data.task_2, data.task_3, data.task_4].filter(Boolean).length;
          setNextMonthDiscount(tasks * TASK_DISCOUNT + (data.extra_discount || 0));
        } else {
          setNextMonthDiscount(0);
        }
      });
  }, [profile?.id, profile?.tickets]);

  if (!profile) return null;

  const expiryDate = profile.expiry_date ? new Date(profile.expiry_date) : null;
  const today = new Date();
  const daysLeft = expiryDate ? Math.floor((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)) : null;
  const isExpired = daysLeft !== null && daysLeft < 0;
  const isActive = profile.status === 'active' && !isExpired;

  const TABS = [
    { key: 'home', label: '홈', icon: Music },
    { key: 'calendar', label: '예약', icon: Calendar },
    { key: 'library', label: '기초 강의', icon: BookOpen },
    { key: 'game', label: '챌린지', icon: Gamepad2 },
    { key: 'ranking', label: '내 작업실', icon: Trophy },
    { key: 'settings', label: '설정', icon: Settings },
  ] as const;

  const daysColor = isExpired
    ? '#f87171'
    : daysLeft !== null && daysLeft <= 7
    ? '#fbbf24'
    : '#34d399';

  return (
    <div className="flex-1 min-h-screen flex flex-col bg-[#0b0f19]">
      {/* Top Nav */}
      <nav className="sticky top-0 z-30 bg-[#0d1117] border-b border-[#1e2940]">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          <Logo theme="dark" size="sm" />
          <div className="flex items-center gap-2">
            <div className="hidden sm:flex items-center gap-2 text-sm">
              <span className="flex items-center gap-1.5 bg-[#141b2d] border border-[#1e2940] text-[#22d3ee] rounded-lg px-2.5 py-1">
                <Ticket size={12} />
                <span className="font-semibold">{profile.tickets}</span>
                <span className="text-[#94a3b8] text-xs">장</span>
              </span>
              <span className="flex items-center gap-1.5 bg-[#141b2d] border border-[#1e2940] text-[#a855f7] rounded-lg px-2.5 py-1">
                <Star size={12} />
                <span className="font-semibold">{profile.points}</span>
                <span className="text-[#94a3b8] text-xs">점</span>
              </span>
            </div>
            <button
              onClick={signOut}
              className="flex items-center gap-1.5 text-sm text-[#94a3b8] hover:text-slate-300 transition-colors px-3 py-1.5 rounded-lg hover:bg-[#141b2d]"
            >
              <LogOut size={14} />
              <span className="hidden sm:inline">로그아웃</span>
            </button>
          </div>
        </div>
      </nav>

      {/* Status Banners */}
      {profile.status === 'pending' && (
        <div className="border-b border-amber-500/20 bg-amber-500/[0.07] px-4 py-2.5 text-center">
          <p className="text-sm text-amber-400 flex items-center justify-center gap-2">
            <AlertCircle size={14} />
            관리자 승인 대기 중입니다. 승인 후 예약 기능이 활성화됩니다.
          </p>
        </div>
      )}
      {isExpired && (
        <div className="border-b border-red-500/20 bg-red-500/[0.07] px-4 py-2.5 text-center">
          <p className="text-sm text-red-400 flex items-center justify-center gap-2">
            <AlertCircle size={14} />
            수강 기간이 만료되었습니다. 연장 신청을 해주세요.
          </p>
        </div>
      )}

      {/* Tab Nav */}
      <div className="sticky z-20 bg-[#0d1117] border-b border-[#1e2940]" style={{ top: 56 }}>
        <div className="max-w-5xl mx-auto px-4">
          <div className="flex overflow-x-auto scrollbar-hide">
            {TABS.map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => { setTab(key as Tab); setSelectedGameId(null); }}
                className={`flex items-center gap-1.5 px-4 py-3.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors
                  ${tab === key
                    ? 'border-[#22d3ee] text-[#22d3ee]'
                    : 'border-transparent text-[#94a3b8] hover:text-slate-300 hover:border-[#1e2940]'
                  }`}
              >
                <Icon size={15} />
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content
          py-6 is the SOLE source of top-padding for every tab.
          Child components must NOT add their own pt-* / mt-* at their root level.
          Exception: 'ranking' (MyStudio) is a full-canvas immersive view that
          intentionally fills all available space — it manages its own layout. */}
      <main className={
        tab === 'ranking'
          ? 'flex-1'
          : 'flex-1 max-w-5xl mx-auto w-full px-4 py-6'
      }>

        {tab === 'home' && (
          <div className="space-y-6">

            {/* Welcome + Stats */}
            <div className="bg-[#141b2d] border border-[#1e2940] rounded-2xl overflow-hidden">
              <div className="h-[2px] bg-gradient-to-r from-[#22d3ee] to-[#a855f7]" />
              <div className="p-6">
                <p className="text-[#94a3b8] text-sm mb-1">안녕하세요,</p>
                <h2 className="text-2xl font-bold">
                  <span className="text-[#22d3ee]">{profile.full_name}</span>
                  <span className="text-white">님</span>
                </h2>
                <div className="mt-5 grid grid-cols-3 gap-3">
                  <div className="bg-[#0b0f19] border border-[#1e2940] rounded-xl px-4 py-3">
                    <p className="text-[#94a3b8] text-xs mb-1.5">잔여 티켓</p>
                    <p className="text-2xl font-bold text-[#22d3ee]">{profile.tickets}</p>
                    <p className="text-[#64748b] text-xs mt-0.5">장</p>
                  </div>
                  <div className="bg-[#0b0f19] border border-[#1e2940] rounded-xl px-4 py-3">
                    <p className="text-[#94a3b8] text-xs mb-1.5">포인트</p>
                    <p className="text-2xl font-bold text-[#a855f7]">{profile.points}</p>
                    <p className="text-[#64748b] text-xs mt-0.5">점</p>
                  </div>
                  <div className="bg-[#0b0f19] border border-[#1e2940] rounded-xl px-4 py-3">
                    <p className="text-[#94a3b8] text-xs mb-1.5">남은 기간</p>
                    <p className="text-2xl font-bold" style={{ color: daysColor }}>
                      {daysLeft !== null ? (isExpired ? '만료' : daysLeft) : '-'}
                    </p>
                    <p className="text-[#64748b] text-xs mt-0.5">
                      {daysLeft !== null && !isExpired ? '일' : ''}
                    </p>
                  </div>
                </div>
                {nextMonthDiscount > 0 && (
                  <div className="mt-3 bg-amber-500/10 border border-amber-500/20 rounded-xl px-4 py-2.5 flex items-center justify-between">
                    <span className="text-xs text-amber-400">다음 달 누적 할인</span>
                    <span className="font-bold text-amber-300">{nextMonthDiscount.toLocaleString()}원</span>
                  </div>
                )}
              </div>
            </div>

            {/* Action Cards */}
            <div>
              {/* 모바일 화면 (sm 미만) 전용 컴팩트 메뉴 박스 */}
              <div className="sm:hidden bg-[#141b2d] border border-[#1e2940] rounded-2xl p-4 flex justify-around items-center">
                <button onClick={() => setActiveModal('registration')} className="flex flex-col items-center gap-2 flex-1">
                  <div className="w-12 h-12 rounded-full bg-[#22d3ee]/10 flex items-center justify-center">
                    <ShoppingBag size={20} className="text-[#22d3ee]" />
                  </div>
                  <span className="text-xs font-medium text-white">재등록</span>
                </button>
                <div className="w-px h-10 bg-[#1e2940]" /> {/* 구분선 */}
                <button onClick={() => setActiveModal('refund')} className="flex flex-col items-center gap-2 flex-1">
                  <div className="w-12 h-12 rounded-full bg-[#64748b]/10 flex items-center justify-center">
                    <RotateCcw size={20} className="text-[#64748b]" />
                  </div>
                  <span className="text-xs font-medium text-white">환불</span>
                </button>
                <div className="w-px h-10 bg-[#1e2940]" /> {/* 구분선 */}
                <button onClick={() => setActiveModal('extension')} className="flex flex-col items-center gap-2 flex-1">
                  <div className="w-12 h-12 rounded-full bg-[#a855f7]/10 flex items-center justify-center">
                    <CalendarClock size={20} className="text-[#a855f7]" />
                  </div>
                  <span className="text-xs font-medium text-white">기간 연장</span>
                </button>
              </div>

              {/* PC 화면 (sm 이상) 전용 기존 대형 카드 */}
              <div className="hidden sm:grid sm:grid-cols-3 gap-4">
                <ActionCard
                  label="재등록 신청"
                  sub="수강 상품 선택"
                  icon={ShoppingBag}
                  accent="#22d3ee"
                  onClick={() => setActiveModal('registration')}
                />
                <ActionCard
                  label="환불 신청"
                  sub="취소 & 환불 처리"
                  icon={RotateCcw}
                  accent="#64748b"
                  onClick={() => setActiveModal('refund')}
                />
                <ActionCard
                  label="기간 연장"
                  sub="수강 기간 연장 신청"
                  icon={CalendarClock}
                  accent="#a855f7"
                  onClick={() => setActiveModal('extension')}
                />
              </div>
            </div>

            {/* Ranking */}
            <RankingBoard profile={profile} />
          </div>
        )}

        {tab === 'calendar' && (
          <ReservationCalendar profile={profile} onRefreshProfile={refreshProfile} />
        )}

        {tab === 'library' && <VideoLibrary />}

        {tab === 'game' && (() => {
          if (selectedGameId) {
            const game = GAMES.find(g => g.id === selectedGameId);
            const GameComponent = game?.component;
            return (
              <div className="space-y-4">
                <button
                  onClick={() => setSelectedGameId(null)}
                  className="flex items-center gap-1.5 text-sm text-[#8fa0dd] hover:text-white transition-colors"
                >
                  ← 로비로 돌아가기
                </button>
                <h3 className="text-lg font-bold text-white">{game?.title}</h3>
                {GameComponent && <GameComponent />}
              </div>
            );
          }
          return <GameLobby games={GAMES} onSelectGame={setSelectedGameId} />;
        })()}

        {tab === 'ranking' && (
          <MyStudio profile={profile} />
        )}

        {tab === 'settings' && (
          <div className="space-y-5">
            <div className="bg-[#141b2d] border border-[#1e2940] rounded-xl p-6">
              <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
                <User size={15} className="text-[#64748b]" />
                내 계정 정보
              </h3>
              <div className="text-sm divide-y divide-[#243047]">
                {[
                  { label: '이름', value: profile.full_name, color: undefined },
                  { label: '전화번호', value: profile.phone || '-', color: undefined },
                  {
                    label: '상태',
                    value: profile.status === 'active' ? '수강 중' : profile.status === 'pending' ? '승인 대기' : '정지',
                    color: profile.status === 'active' ? '#34d399' : '#fbbf24',
                  },
                  { label: '만료일', value: expiryDate ? expiryDate.toLocaleDateString('ko-KR') : '—', color: undefined },
                  { label: '잔여 티켓', value: `${profile.tickets}장`, color: undefined },
                ].map(({ label, value, color }) => (
                  <div key={label} className="flex justify-between items-center py-3">
                    <span className="text-[#94a3b8]">{label}</span>
                    <span className="font-medium" style={{ color: color ?? '#f8fafc' }}>{value}</span>
                  </div>
                ))}
              </div>
            </div>
            <PasswordChange theme="dark" />
          </div>
        )}
      </main>

      <Modal open={activeModal === 'registration'} onClose={() => setActiveModal(null)} title="재등록 신청" size="lg" theme="dark">
        <RegistrationRequest profile={profile} futureBookings={futureBookings} />
      </Modal>
      <Modal open={activeModal === 'refund'} onClose={() => setActiveModal(null)} title="환불 신청" size="md" theme="dark">
        <RefundRequest profile={profile} futureBookings={futureBookings} />
      </Modal>
      <Modal open={activeModal === 'extension'} onClose={() => setActiveModal(null)} title="기간 연장 신청" size="md" theme="dark">
        <ExtensionRequest profile={profile} onRefreshProfile={refreshProfile} />
      </Modal>
    </div>
  );
}

interface ActionCardProps {
  label: string;
  sub: string;
  icon: React.ElementType;
  accent: string;
  onClick: () => void;
}

function ActionCard({ label, sub, icon: Icon, accent, onClick }: ActionCardProps) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="bg-[#141b2d] rounded-2xl p-5 text-left flex flex-col gap-4 transition-colors duration-200 border"
      style={{ borderColor: hovered ? `${accent}60` : '#1e2940' }}
    >
      <div
        className="w-11 h-11 rounded-xl flex items-center justify-center"
        style={{ background: `${accent}18` }}
      >
        <Icon size={20} style={{ color: accent }} />
      </div>
      <div className="flex-1">
        <p className="font-semibold text-white text-[15px]">{label}</p>
        <p className="text-sm text-[#cbd5e1] mt-0.5">{sub}</p>
      </div>
      <ChevronRight size={15} className="text-[#64748b] self-end" />
    </button>
  );
}
