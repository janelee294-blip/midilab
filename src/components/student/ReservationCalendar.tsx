import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Calendar, ChevronLeft, ChevronRight, Clock, CheckCircle,
  AlertCircle, CalendarDays
} from 'lucide-react';

function localDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
import { supabase, type TimeSlot, type Reservation, type Profile } from '../../lib/supabase';
import { sendDiscordNotification, sendStudentWebhook, DISCORD_COLORS } from '../../lib/discord';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Modal } from '../ui/Modal';

interface ReservationCalendarProps {
  profile: Profile;
  onRefreshProfile: () => void;
}

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number) {
  return new Date(year, month, 1).getDay();
}

export function ReservationCalendar({ profile, onRefreshProfile }: ReservationCalendarProps) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const maxDate = new Date(today);
  maxDate.setDate(today.getDate() + 90);
  const maxDateStr = localDateStr(maxDate);
  const maxYear = maxDate.getFullYear();
  const maxMonth = maxDate.getMonth();

  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [myReservations, setMyReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(false);
  const [bookingSlot, setBookingSlot] = useState<TimeSlot | null>(null);
  const [cancelModal, setCancelModal] = useState<Reservation | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);
  const [monthSlots, setMonthSlots] = useState<Record<string, { total: number; available: number }>>({});

  const showToast = (msg: string, ok: boolean) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3000);
  };

  const loadSlots = useCallback(async (silent = false) => {
    if (!selectedDate) return;
    // silent=true: post-action refresh (booking/cancel) — keep slot grid visible
    // silent=false: date change or initial load — show spinner in slot area
    if (!silent) setLoading(true);
    const { data } = await supabase
      .from('time_slots')
      .select('*')
      .eq('slot_date', selectedDate)
      .order('start_time');
    setSlots(data || []);
    if (!silent) setLoading(false);
  }, [selectedDate]);

  const loadMyReservations = useCallback(async () => {
    const { data } = await supabase
      .from('reservations')
      .select('*, time_slots(*)')
      .eq('user_id', profile.id)
      .eq('status', 'confirmed')
      .order('created_at', { ascending: false });
    setMyReservations(data || []);
  }, [profile.id]);

  useEffect(() => { loadSlots(); }, [loadSlots]);
  useEffect(() => { loadMyReservations(); }, [loadMyReservations]);

  const loadMonthSlots = useCallback(async () => {
    const startDate = `${year}-${String(month + 1).padStart(2, '0')}-01`;
    const endDate = `${year}-${String(month + 1).padStart(2, '0')}-${getDaysInMonth(year, month)}`;
    const { data } = await supabase
      .from('time_slots')
      .select('slot_date, is_available')
      .gte('slot_date', startDate)
      .lte('slot_date', endDate);
    const map: Record<string, { total: number; available: number }> = {};
    (data || []).forEach((s: any) => {
      if (!map[s.slot_date]) map[s.slot_date] = { total: 0, available: 0 };
      map[s.slot_date].total++;
      if (s.is_available) map[s.slot_date].available++;
    });
    setMonthSlots(map);
  }, [year, month]);

  useEffect(() => { loadMonthSlots(); }, [loadMonthSlots]);

  const loadSlotsRef = useRef(loadSlots);
  const loadMonthSlotsRef = useRef(loadMonthSlots);
  const loadMyReservationsRef = useRef(loadMyReservations);
  useEffect(() => { loadSlotsRef.current = loadSlots; }, [loadSlots]);
  useEffect(() => { loadMonthSlotsRef.current = loadMonthSlots; }, [loadMonthSlots]);
  useEffect(() => { loadMyReservationsRef.current = loadMyReservations; }, [loadMyReservations]);

  useEffect(() => {
    const slotChannel = supabase
      .channel('student_slots_rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'time_slots' }, () => {
        loadMonthSlotsRef.current();
        loadSlotsRef.current();
        loadMyReservationsRef.current();
      })
      .subscribe();

    const reservationChannel = supabase
      .channel('student_reservations_rt')
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'reservations', filter: `user_id=eq.${profile.id}`,
      }, () => {
        loadMyReservationsRef.current();
      })
      .subscribe();

    const profileChannel = supabase
      .channel('student_profile_rt')
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'profiles', filter: `id=eq.${profile.id}`,
      }, () => {
        onRefreshProfile();
        loadMyReservationsRef.current();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(slotChannel);
      supabase.removeChannel(reservationChannel);
      supabase.removeChannel(profileChannel);
    };
  }, [profile.id, onRefreshProfile]);

  function isSlotBookable(slotDate: string) {
    const slot = new Date(slotDate);
    const diff = Math.floor((slot.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return diff >= 3;
  }

  function getCancellationPenalty(slotDate: string): { points: number; returnTicket: boolean } {
    const slot = new Date(slotDate);
    const diff = Math.floor((slot.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    if (diff < 0) return { points: 0, returnTicket: false };
    if (diff === 0) return { points: 0, returnTicket: false };
    if (diff === 1) return { points: 3, returnTicket: true };
    if (diff === 2) return { points: 2, returnTicket: true };
    if (diff === 3) return { points: 1, returnTicket: true };
    return { points: 0, returnTicket: true };
  }

  async function handleBook(slot: TimeSlot) {
    if (profile.status !== 'active') return showToast('수강 승인 후 예약 가능합니다.', false);
    if (profile.expiry_date && new Date(profile.expiry_date) < today) return showToast('수강 기간이 만료되었습니다.', false);
    if (profile.tickets <= 0) return showToast('잔여 티켓이 없습니다.', false);
    if (!isSlotBookable(slot.slot_date)) return showToast('레슨 3일 전부터 예약이 가능합니다.', false);

    setActionLoading(true);
    const { data: res, error } = await supabase
      .from('reservations')
      .insert({ user_id: profile.id, slot_id: slot.id, status: 'confirmed' })
      .select()
      .single();

    if (error) { showToast('예약에 실패했습니다.', false); setActionLoading(false); return; }

    await supabase.from('time_slots').update({ is_available: false, booked_by: profile.id }).eq('id', slot.id);
    await supabase.from('profiles').update({ tickets: profile.tickets - 1 }).eq('id', profile.id);
    await supabase.from('notifications').insert({
      type: 'reservation',
      title: '레슨 예약 완료',
      body: `${profile.full_name}님이 ${slot.slot_date} ${slot.start_time} 레슨을 예약했습니다.`,
      user_id: profile.id,
    });

    await sendDiscordNotification(
      '레슨 예약',
      `**학생:** ${profile.full_name}\n**날짜:** ${slot.slot_date}\n**시간:** ${slot.start_time}–${slot.end_time}`,
      DISCORD_COLORS.SUCCESS
    );

    const newTickets = profile.tickets - 1;
    console.log('[WEBHOOK_STEP1] WEBHOOK_TRIGGER', 'booking_created', profile.id);
    await sendStudentWebhook(profile.id, 'booking_created', {
      date: slot.slot_date,
      time: `${slot.start_time.slice(0, 5)}–${slot.end_time.slice(0, 5)}`,
      tickets: newTickets,
    });
    if (newTickets === 1) {
      console.log('[WEBHOOK_STEP1] WEBHOOK_TRIGGER', 'ticket_low', profile.id);
      await sendStudentWebhook(profile.id, 'ticket_low', {});
    }

    showToast('예약이 완료되었습니다!', true);
    setBookingSlot(null);
    loadSlots(true); // silent — keep slot grid visible while refreshing
    loadMyReservations();
    onRefreshProfile();
    setActionLoading(false);
  }

  async function handleCancel(reservation: Reservation) {
    if (!reservation.time_slots) return;
    const slotDate = reservation.time_slots.slot_date;
    const { points, returnTicket } = getCancellationPenalty(slotDate);
    const slot = new Date(slotDate);
    const diff = Math.floor((slot.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    const isNoshow = diff < 0;
    const isSameDay = diff === 0;

    setActionLoading(true);

    await supabase.rpc('apply_cancellation_penalty', {
      p_reservation_id: reservation.id,
      p_user_id: profile.id,
      p_penalty_points: points,
      p_return_ticket: !isSameDay && !isNoshow,
    });

    let msg = '';
    if (isSameDay) msg = '당일 취소로 티켓 1개가 소멸됩니다.';
    else if (isNoshow) msg = '노쇼 처리되었습니다.';
    else msg = `취소 완료. 패널티 -${points}점${returnTicket ? ', 티켓 1개 복구' : ''}.`;

    await supabase.from('notifications').insert({
      type: 'cancellation',
      title: '레슨 취소',
      body: `${profile.full_name}님이 ${slotDate} 레슨을 취소했습니다. 패널티: -${points}점`,
      user_id: profile.id,
    });

    await sendDiscordNotification(
      '레슨 취소',
      `**학생:** ${profile.full_name}\n**날짜:** ${slotDate}\n**패널티:** -${points}점\n**티켓 복구:** ${returnTicket ? '예' : '아니오'}`,
      DISCORD_COLORS.WARNING
    );

    console.log('[WEBHOOK_STEP1] WEBHOOK_TRIGGER', 'booking_cancelled', profile.id);
    await sendStudentWebhook(profile.id, 'booking_cancelled', {
      date: slotDate,
      time: reservation.time_slots!.start_time.slice(0, 5),
      penaltyPoints: points,
      ticketRefunded: returnTicket,
    });

    showToast(msg, true);
    setCancelModal(null);
    loadMyReservations();
    loadSlots(true); // silent — keep slot grid visible while refreshing
    onRefreshProfile();
    setActionLoading(false);
  }

  const myBookedDates = new Set(
    myReservations.filter(r => r.time_slots).map(r => r.time_slots!.slot_date)
  );

  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);

  function prevMonth() {
    if (month === 0) { setYear(y => y - 1); setMonth(11); } else setMonth(m => m - 1);
  }
  function nextMonth() {
    if (year > maxYear || (year === maxYear && month >= maxMonth)) return;
    if (month === 11) { setYear(y => y + 1); setMonth(0); } else setMonth(m => m + 1);
  }
  const canGoNext = !(year > maxYear || (year === maxYear && month >= maxMonth));

  const monthName = new Date(year, month, 1).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long' });

  return (
    <div className="space-y-5">
      {toast && (
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg text-sm font-medium transition-all
          ${toast.ok ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'}`}>
          {toast.ok ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
          {toast.msg}
        </div>
      )}

      {/* My Reservations */}
      {myReservations.length > 0 && (
        <div className="bg-[#141b2d] rounded-2xl border border-[#1e2940] p-5">
          <h3 className="font-semibold text-white mb-3 flex items-center gap-2">
            <CalendarDays size={16} className="text-[#22d3ee]" />
            예약된 레슨
          </h3>
          <div className="space-y-2">
            {myReservations.map((res) => (
              <div key={res.id} className="flex items-center justify-between p-3 bg-[#0b0f19] border border-[#1e2940] rounded-xl">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-[#22d3ee]/10 flex items-center justify-center">
                    <Clock size={14} className="text-[#22d3ee]" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white">
                      {res.time_slots?.slot_date} {res.time_slots?.start_time?.slice(0, 5)}–{res.time_slots?.end_time?.slice(0, 5)}
                    </p>
                    {!isSlotBookable(res.time_slots?.slot_date || '') && (
                      <p className="text-xs text-amber-400">취소 시 패널티 적용</p>
                    )}
                  </div>
                </div>
                <Button size="sm" variant="warning" onClick={() => setCancelModal(res)}>취소</Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Calendar */}
      <div className="bg-[#141b2d] rounded-2xl border border-[#1e2940] p-4">
        <div className="flex items-center justify-between mb-3">
          <button onClick={prevMonth} className="p-2 hover:bg-[#1e2940] rounded-lg transition-colors">
            <ChevronLeft size={18} className="text-[#8fa0dd]" />
          </button>
          <h3 className="font-semibold text-white">{monthName}</h3>
          <button onClick={nextMonth} disabled={!canGoNext} className="p-2 hover:bg-[#1e2940] rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed">
            <ChevronRight size={18} className="text-[#8fa0dd]" />
          </button>
        </div>

        <div className="grid grid-cols-7 gap-0.5 mb-1">
          {['일','월','화','수','목','금','토'].map(d => (
            <div key={d} className="text-center text-xs font-medium text-[#94a3b8] py-0.5">{d}</div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-0.5">
          {Array.from({ length: firstDay }).map((_, i) => <div key={`e${i}`} />)}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day = i + 1;
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const todayStr2 = localDateStr(today);
            const isToday = dateStr === todayStr2;
            const isSelected = dateStr === selectedDate;
            const isAfterMax = dateStr > maxDateStr;
            const diff3 = Math.floor((new Date(dateStr).getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
            const isWithin3Days = diff3 < 3;
            const dateSlotData = monthSlots[dateStr];
            const isFullyBooked = !!(dateSlotData && dateSlotData.total > 0 && dateSlotData.available === 0);
            const hasMyReservation = myBookedDates.has(dateStr);
            const isDisabled = isAfterMax || isWithin3Days || isFullyBooked;

            let cls = 'h-9 rounded-lg text-sm font-medium transition-all duration-150 flex flex-col items-center justify-center gap-0 ';
            if (isSelected) {
              cls += 'bg-[#22d3ee] text-[#0b0f19] shadow-[0_0_12px_rgba(34,211,238,0.4)] ';
            } else if (isToday) {
              cls += 'ring-1 ring-[#22d3ee]/60 text-[#22d3ee] bg-[#22d3ee]/10 ';
            } else if (hasMyReservation) {
              cls += 'bg-[#22d3ee]/10 text-[#22d3ee] ';
            } else if (isDisabled) {
              cls += 'text-[#334155] opacity-50 cursor-not-allowed ';
            } else {
              cls += 'text-[#cbd5e1] hover:bg-[#1e2940] cursor-pointer ';
            }

            return (
              <button
                key={day}
                onClick={() => !isDisabled && setSelectedDate(isSelected ? null : dateStr)}
                disabled={isDisabled}
                className={cls}
              >
                {day}
                {hasMyReservation && (
                  <span className={`text-[8px] font-bold leading-none ${isSelected ? 'text-[#0b0f19]' : 'text-[#22d3ee]'}`}>
                    예약
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Time Slots */}
      {selectedDate && (
        <div className="bg-[#141b2d] rounded-2xl border border-[#1e2940] p-5">
          <h3 className="font-semibold text-white mb-3 flex items-center gap-2">
            <Clock size={16} className="text-[#22d3ee]" />
            {selectedDate} 예약 가능 시간
          </h3>
          {loading ? (
            <div className="flex items-center justify-center py-8 text-[#475569]">
              <svg className="animate-spin h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              불러오는 중...
            </div>
          ) : slots.length === 0 ? (
            <p className="text-[#475569] text-sm text-center py-6">이 날짜에 예약 가능한 슬롯이 없습니다.</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {slots.map((slot) => {
                const bookable = isSlotBookable(slot.slot_date);
                const mine = myReservations.some(r => r.slot_id === slot.id);
                const unavailable = !slot.is_available || mine;
                return (
                  <div
                    key={slot.id}
                    className={`p-3 rounded-xl border transition-all
                      ${unavailable
                        ? 'bg-[#0b0f19] border-[#1e2940] opacity-50'
                        : 'bg-[#0b0f19] border-[#1e2940] hover:border-[#22d3ee]/50 cursor-pointer'
                      }`}
                  >
                    <p className="text-sm font-semibold text-white">{slot.start_time.slice(0,5)}–{slot.end_time.slice(0,5)}</p>
                    {mine ? (
                      <Badge variant="success" className="mt-1">내 예약</Badge>
                    ) : !slot.is_available ? (
                      <Badge variant="danger" className="mt-1">예약됨</Badge>
                    ) : !bookable ? (
                      <Badge variant="warning" className="mt-1">예약 불가</Badge>
                    ) : (
                      <button
                        onClick={() => setBookingSlot(slot)}
                        disabled={profile.tickets <= 0 || profile.status !== 'active'}
                        className="mt-1 text-xs text-[#22d3ee] font-medium hover:text-cyan-300 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                      >
                        예약하기
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Booking Confirmation Modal */}
      <Modal open={!!bookingSlot} onClose={() => setBookingSlot(null)} title="레슨 예약 확인" theme="dark">
        {bookingSlot && (
          <div className="space-y-4">
            <div className="bg-[#0b0f19] border border-[#1e2940] rounded-xl p-4">
              <p className="text-sm text-[#8fa0dd]">날짜: <span className="font-semibold text-white">{bookingSlot.slot_date}</span></p>
              <p className="text-sm text-[#8fa0dd] mt-1">시간: <span className="font-semibold text-white">{bookingSlot.start_time.slice(0,5)}–{bookingSlot.end_time.slice(0,5)}</span></p>
              <p className="text-sm text-[#8fa0dd] mt-1">사용 티켓: <span className="font-semibold text-white">1장 (잔여 {profile.tickets}장)</span></p>
            </div>
            <p className="text-xs text-[#475569]">예약 후 취소 시 패널티 포인트가 차감될 수 있습니다.</p>
            <div className="flex gap-3 pt-2">
              <Button variant="dark-secondary" onClick={() => setBookingSlot(null)} className="flex-1">취소</Button>
              <Button variant="cyan" loading={actionLoading} onClick={() => handleBook(bookingSlot)} className="flex-1">예약 확정</Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Cancel Confirmation Modal */}
      <Modal open={!!cancelModal} onClose={() => setCancelModal(null)} title="예약 취소" theme="dark">
        {cancelModal?.time_slots && (() => {
          const { points, returnTicket } = getCancellationPenalty(cancelModal.time_slots!.slot_date);
          const diff = Math.floor((new Date(cancelModal.time_slots!.slot_date).getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
          return (
            <div className="space-y-4">
              <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4">
                <p className="text-sm font-medium text-amber-400 mb-2">취소 패널티 안내</p>
                {diff < 0 || diff === 0 ? (
                  <p className="text-sm text-amber-300">당일 취소 및 노쇼는 티켓 1개가 즉시 소멸됩니다.</p>
                ) : points === 0 ? (
                  <p className="text-sm text-emerald-400">4일 이상 전 취소 — 패널티 없음 / 티켓 1개 복구</p>
                ) : (
                  <p className="text-sm text-amber-300">
                    -{points}점 포인트 차감 / 티켓 1개 복구
                  </p>
                )}
              </div>
              <p className="text-sm text-[#8fa0dd]">
                {cancelModal.time_slots?.slot_date} {cancelModal.time_slots?.start_time.slice(0,5)} 레슨을 취소하시겠습니까?
              </p>
              <div className="flex gap-3 pt-2">
                <Button variant="dark-secondary" onClick={() => setCancelModal(null)} className="flex-1">돌아가기</Button>
                <Button variant="warning" loading={actionLoading} onClick={() => handleCancel(cancelModal)} className="flex-1">취소 확정</Button>
              </div>
            </div>
          );
        })()}
      </Modal>
    </div>
  );
}
