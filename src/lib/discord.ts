import { supabase } from './supabase';

export type StudentEventType =
  | 'booking_created'
  | 'booking_cancelled'
  | 'booking_cancelled_by_admin'
  | 'lesson_today'
  | 'refund_approved'
  | 'refund_rejected'
  | 'extension_approved'
  | 'extension_rejected'
  | 're_registration_approved'
  | 're_registration_rejected'
  | 'product_purchase_approved'
  | 'ticket_low'
  | 'expiry_warning';

export interface StudentWebhookPayload {
  date?: string;
  time?: string;
  penaltyPoints?: number;
  ticketRefunded?: boolean;
  newExpiryDate?: string;
  tickets?: number;
  daysLeft?: number;
  productName?: string;
  refundAmount?: number;
  adminNote?: string;
}

type TemplateResult = { title: string; description: string; color: number };

const EVENT_TEMPLATES: Record<StudentEventType, (p: StudentWebhookPayload) => TemplateResult> = {
  booking_created: (p) => ({
    title: '📅 레슨 예약 완료',
    description: `**날짜:** ${p.date}\n**시간:** ${p.time}\n**잔여 티켓:** ${p.tickets}장`,
    color: 0x57f287,
  }),
  booking_cancelled: (p) => ({
    title: '❌ 레슨 예약 취소',
    description: [
      `**날짜:** ${p.date}`,
      `**시간:** ${p.time}`,
      p.penaltyPoints ? `**패널티:** -${p.penaltyPoints}점` : null,
      p.ticketRefunded ? '**티켓:** 1장 복구됨' : null,
    ].filter(Boolean).join('\n'),
    color: 0xed4245,
  }),
  booking_cancelled_by_admin: (p) => ({
    title: '❌ 관리자에 의해 예약이 취소되었습니다',
    description: [
      `**날짜:** ${p.date}`,
      `**시간:** ${p.time}`,
      '티켓 1장이 복구되었습니다.',
    ].filter(Boolean).join('\n'),
    color: 0xed4245,
  }),
  lesson_today: (p) => ({
    title: '🎵 오늘 레슨 안내',
    description: `오늘 레슨이 있습니다!\n**시간:** ${p.time}`,
    color: 0x5865f2,
  }),
  refund_approved: (p) => ({
    title: '💸 환불 승인',
    description: `환불이 승인되었습니다.\n**환불액:** ${p.refundAmount?.toLocaleString()}원\n**잔여 티켓:** ${p.tickets}장`,
    color: 0x57f287,
  }),
  refund_rejected: (p) => ({
    title: '❌ 환불 반려',
    description: [
      '환불 신청이 반려되었습니다.',
      p.adminNote ? `**사유:** ${p.adminNote}` : null,
    ].filter(Boolean).join('\n'),
    color: 0xed4245,
  }),
  extension_approved: (p) => ({
    title: '📆 수강기간 연장 승인',
    description: `수강기간이 7일 연장되었습니다.\n**새 만료일:** ${p.newExpiryDate}`,
    color: 0x57f287,
  }),
  extension_rejected: (p) => ({
    title: '❌ 수강기간 연장 반려',
    description: [
      '수강기간 연장 신청이 반려되었습니다.',
      p.adminNote ? `**사유:** ${p.adminNote}` : null,
    ].filter(Boolean).join('\n'),
    color: 0xed4245,
  }),
  re_registration_approved: (p) => ({
    title: '✅ 재등록 승인',
    description: [
      '재등록이 승인되었습니다.',
      p.productName ? `**상품:** ${p.productName}` : null,
      p.tickets != null ? `**추가 티켓:** ${p.tickets}장` : null,
      p.newExpiryDate ? `**만료일:** ${p.newExpiryDate}` : null,
    ].filter(Boolean).join('\n'),
    color: 0x57f287,
  }),
  re_registration_rejected: (p) => ({
    title: '❌ 재등록 신청 반려',
    description: [
      '재등록 신청이 반려되었습니다.',
      p.adminNote ? `**사유:** ${p.adminNote}` : null,
    ].filter(Boolean).join('\n'),
    color: 0xed4245,
  }),
  product_purchase_approved: (p) => ({
    title: '🛍️ 상품 구매 승인',
    description: [
      '상품 구매가 승인되었습니다.',
      p.productName ? `**상품:** ${p.productName}` : null,
      p.tickets != null ? `**추가 티켓:** ${p.tickets}장` : null,
    ].filter(Boolean).join('\n'),
    color: 0x57f287,
  }),
  ticket_low: (_p) => ({
    title: '⚠️ 잔여 티켓 1장',
    description: '티켓이 1장 남았습니다. 수강기간 연장 또는 재등록을 신청하세요.',
    color: 0xfee75c,
  }),
  expiry_warning: (p) => ({
    title: '⏰ 수강기간 만료 임박',
    description: `수강기간이 **${p.daysLeft}일** 남았습니다.\n**만료일:** ${p.newExpiryDate}`,
    color: 0xfee75c,
  }),
};

export async function sendStudentWebhook(
  studentId: string,
  eventType: StudentEventType,
  payload: StudentWebhookPayload = {}
): Promise<void> {
  // STEP2: sendStudentWebhook 진입 확인
  console.log('[WEBHOOK_STEP2] sendStudentWebhook 진입', { eventType, studentId, payload });

  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('discord_webhook')
      .eq('id', studentId)
      .maybeSingle();

    if (error) {
      console.log('[WEBHOOK_STEP2] profiles 조회 오류:', error.message);
      return;
    }

    const webhookUrl = data?.discord_webhook;
    console.log('[WEBHOOK_STEP2] webhook URL 존재 여부:', webhookUrl ? 'YES' : 'NO_WEBHOOK_URL_SKIP');

    if (!webhookUrl) return;

    const { title, description, color } = EVENT_TEMPLATES[eventType](payload);

    // STEP3: 실제 fetch 전 확인
    console.log('[WEBHOOK_STEP3] WEBHOOK_SEND_ATTEMPT', webhookUrl);

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        embeds: [{ title, description, color, timestamp: new Date().toISOString() }],
      }),
    });

    // STEP3: 응답 결과 확인
    console.log('[WEBHOOK_STEP3] 응답 결과:', { ok: response.ok, status: response.status, eventType });
    if (!response.ok) {
      console.log('[WEBHOOK_STEP3] 전송 실패 — status:', response.status, 'eventType:', eventType);
    }
  } catch (err: any) {
    console.log('[WEBHOOK_STEP2] 예외 발생:', err?.message ?? err);
  }
}

export async function sendDiscordNotification(
  title: string,
  body: string,
  color: number = 0x5865f2
): Promise<void> {
  try {
    const { data } = await supabase
      .from('platform_config')
      .select('value')
      .eq('key', 'discord_webhook')
      .maybeSingle();

    const webhookUrl = data?.value;
    if (!webhookUrl) return;

    await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        embeds: [{ title, description: body, color, timestamp: new Date().toISOString() }],
      }),
    });
  } catch {
    // Discord notifications are best-effort; never block main flow
  }
}

export const DISCORD_COLORS = {
  INFO: 0x5865f2,
  SUCCESS: 0x57f287,
  WARNING: 0xfee75c,
  ERROR: 0xed4245,
  PURPLE: 0x9b59b6,
};
