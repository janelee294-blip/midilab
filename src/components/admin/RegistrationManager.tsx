import React, { useState, useEffect, useCallback } from 'react';
import { ShoppingBag, CheckCircle, XCircle, RefreshCw } from 'lucide-react';
import { supabase, type Registration } from '../../lib/supabase';
import { sendStudentWebhook } from '../../lib/discord';
import { insertFinancialEvent } from '../../lib/adminApi';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';

const TASK_DISCOUNT = 20000;

export function RegistrationManager({ onAction }: { onAction?: () => void }) {
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [discounts, setDiscounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  const showToast = (msg: string, ok: boolean) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3000);
  };

  const loadRegistrations = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('registrations')
      .select('*, profiles(full_name, phone, expiry_date, tickets), products(name, total_price, tickets, duration_days)')
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(50);
    if (error) console.error('registrations load error', error);
    setRegistrations((data as any[]) || []);

    // Fetch task discounts for each student (no month filter — global assignment)
    if (data && data.length > 0) {
      const studentIds = data.map((r: any) => r.student_id);
      const { data: taskData } = await supabase
        .from('task_assignments')
        .select('student_id, task_1, task_2, task_3, task_4, extra_discount')
        .in('student_id', studentIds);
      const discountMap: Record<string, number> = {};
      (taskData || []).forEach((t: any) => {
        const tasks = [t.task_1, t.task_2, t.task_3, t.task_4].filter(Boolean).length;
        discountMap[t.student_id] = tasks * TASK_DISCOUNT + (t.extra_discount || 0);
      });
      setDiscounts(discountMap);
    }
    setLoading(false);
  }, []);

  useEffect(() => { loadRegistrations(); }, [loadRegistrations]);

  async function handleApprove(reg: any) {
    setActionLoading(reg.id);

    const durationDays: number | null = reg.products?.duration_days ?? null;
    const addTickets: number = reg.products?.tickets ?? 0;
    const currentTickets: number = reg.profiles?.tickets ?? 0;

    // ① 기간 제한 상품: 만료일 누적 연산
    // ② 무제한 상품: 만료일 건드리지 않음
    const profileUpdate: Record<string, unknown> = {
      tickets: currentTickets + addTickets,
    };

    if (durationDays) {
      const currentExpiry = reg.profiles?.expiry_date
        ? new Date(reg.profiles.expiry_date)
        : new Date();
      const base = Math.max(currentExpiry.getTime(), Date.now());
      profileUpdate.expiry_date = new Date(base + durationDays * 24 * 60 * 60 * 1000).toISOString();
    }

    // 연장 신청 횟수 초기화: 해당 학생의 approved 연장 이력 삭제
    await supabase
      .from('extensions')
      .delete()
      .eq('user_id', reg.student_id)
      .eq('status', 'approved');

    // 프로필 업데이트 (만료일 + 티켓 합산)
    const { error: profileErr } = await supabase
      .from('profiles')
      .update(profileUpdate)
      .eq('id', reg.student_id);

    // 재등록 상태 승인으로 변경
    const { error: regErr } = await supabase
      .from('registrations')
      .update({ status: 'approved' })
      .eq('id', reg.id);

    if (profileErr || regErr) {
      console.error('🛑 [재등록 승인 실패]:', profileErr || regErr);
      showToast('처리 중 오류가 발생했습니다.', false);
    } else {
      // 음원 작업 옵션 포함 여부 확인 → project_works 이관
      const selectedOptions: string[] = reg.selected_options || [];
      if (selectedOptions.length > 0) {
        const { data: optionProducts } = await supabase
          .from('products')
          .select('id, name, is_project_work, total_price')
          .in('id', selectedOptions);
        const projectItems = (optionProducts || []).filter((p: any) => p.is_project_work);
        if (projectItems.length > 0) {
          await supabase.from('project_works').insert(
            projectItems.map((p: any) => ({
              registration_id: reg.id,
              student_id: reg.student_id,
              student_name: reg.profiles?.full_name || '',
              product_name: p.name,
              price: p.total_price || 0,
              status: 'pending',
            }))
          );
        }
      }
      // 재등록 매출 기록: 상품가 - 과제 할인 = 실수령 금액
      const grossPrice: number = reg.total_price || reg.products?.total_price || 0;
      const taskDiscount: number = discounts[reg.student_id] || 0;
      const netRevenue = grossPrice - taskDiscount;
      if (netRevenue > 0) {
        await insertFinancialEvent({
          type: 'revenue',
          amount: netRevenue,
          source: 'subscription',
          note: `재등록: ${reg.products?.name ?? ''}${taskDiscount > 0 ? ` (과제할인 -${taskDiscount.toLocaleString()}원 적용)` : ''}`,
          student_id: reg.student_id,
        });
      }

      showToast('승인 완료되었습니다.', true);
      setRegistrations(prev => prev.filter(r => r.id !== reg.id));

      console.log('[WEBHOOK_STEP1] WEBHOOK_TRIGGER', 're_registration_approved', reg.student_id);
      await sendStudentWebhook(reg.student_id, 're_registration_approved', {
        productName: reg.products?.name,
        tickets: reg.products?.tickets ?? 0,
        newExpiryDate: profileUpdate.expiry_date
          ? new Date(profileUpdate.expiry_date as string).toLocaleDateString('ko-KR')
          : undefined,
      });

      onAction?.();
    }
    setActionLoading(null);
  }

  return (
    <div className="space-y-5">
      {toast && (
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg text-sm font-medium
          ${toast.ok ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'}`}>
          {toast.ok ? <CheckCircle size={16} /> : <XCircle size={16} />}
          {toast.msg}
        </div>
      )}

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShoppingBag size={16} className="text-blue-500" />
            <h3 className="font-semibold text-slate-900">재등록 신청 관리</h3>
            {registrations.length > 0 && (
              <Badge variant="warning">{registrations.length}</Badge>
            )}
          </div>
          <Button size="sm" variant="ghost" onClick={loadRegistrations}>
            <RefreshCw size={14} />
          </Button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-10 text-slate-400">
            <RefreshCw size={18} className="animate-spin mr-2" />불러오는 중...
          </div>
        ) : registrations.length === 0 ? (
          <div className="text-center py-10 text-slate-400 text-sm">
            대기 중인 재등록 신청이 없습니다.
          </div>
        ) : (
<div className="divide-y divide-slate-50">
            {registrations.map((reg: any) => (
              <div key={reg.id} className="px-5 py-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <p className="font-medium text-slate-900 text-sm">
                        {reg.profiles?.full_name}
                      </p>
                      <Badge variant="warning">대기</Badge>
                    </div>
                    <p className="text-xs text-slate-500 mb-1">{reg.profiles?.phone}</p>
                    
                    {/* PC 전용: 원본 코드 100% 복원 */}
                    <div className="hidden md:inline-flex items-center gap-1.5 bg-blue-50 border border-blue-100 rounded-lg px-2.5 py-1 mt-1">
                      <ShoppingBag size={11} className="text-blue-500" />
                      <span className="text-xs font-medium text-blue-700">
                        {reg.products?.name}
                      </span>
                      <span className="text-xs text-blue-500">
                        — {(reg.total_price || reg.products?.total_price || 0).toLocaleString()}원
                        {reg.products?.tickets ? ` / ${reg.products.tickets}회` : ''}
                        {reg.products?.duration_days ? ` / ${reg.products.duration_days}일` : ' / 기간무제한'}
                      </span>
                    </div>

                    {/* 모바일 전용: 내용 잘림 방지를 위해 상품명과 가격을 위아래로 분리 */}
                    <div className="md:hidden flex flex-col gap-0.5 bg-blue-50 border border-blue-100 rounded-lg px-2.5 py-1.5 mt-1 w-fit">
                      <div className="flex items-center gap-1.5">
                        <ShoppingBag size={11} className="text-blue-500" />
                        <span className="text-xs font-medium text-blue-700">
                          {reg.products?.name}
                        </span>
                      </div>
                      <span className="text-xs text-blue-500 ml-4">
                        {(reg.total_price || reg.products?.total_price || 0).toLocaleString()}원
                        {reg.products?.tickets ? ` / ${reg.products.tickets}회` : ''}
                        {reg.products?.duration_days ? ` / ${reg.products.duration_days}일` : ' / 기간무제한'}
                      </span>
                    </div>

                    {/* 과제 할인: 원본 코드 복원 */}
                    {discounts[reg.student_id] > 0 && (
                      <div className="inline-flex items-center gap-1.5 bg-amber-50 border border-amber-100 rounded-lg px-2.5 py-1 mt-1.5">
                        <span className="text-xs text-amber-600">과제 할인</span>
                        <span className="text-xs font-bold text-amber-700">-{discounts[reg.student_id].toLocaleString()}원</span>
                      </div>
                    )}
                    
                    <p className="text-xs text-slate-400 mt-1.5">
                      신청일: {new Date(reg.created_at).toLocaleDateString('ko-KR')}
                    </p>
                  </div>
                  
                  {/* 승인 버튼: 원본 코드 복원 */}
                  <div className="shrink-0">
                    <Button
                      size="sm"
                      variant="success"
                      loading={actionLoading === reg.id}
                      onClick={() => handleApprove(reg)}
                    >
                      승인
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
