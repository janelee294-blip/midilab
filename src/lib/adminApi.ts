// Server-side Edge Function bridge for admin-only financial operations.
// All writes and financial reads go through Edge Functions that validate
// the session token from the Authorization header — never from the request body.

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const ANON_KEY     = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

const SESSION_TOKEN_KEY = 'midilab_admin_token';

export function getSessionToken(): string {
  return localStorage.getItem(SESSION_TOKEN_KEY) ?? '';
}

export function storeSessionToken(token: string | null): void {
  if (token) localStorage.setItem(SESSION_TOKEN_KEY, token);
  else localStorage.removeItem(SESSION_TOKEN_KEY);
}

function authHeaders(): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    'apikey': ANON_KEY,
    'Authorization': `Bearer ${getSessionToken()}`,
  };
}

async function callEdgeFn(slug: string, payload: object): Promise<{ error?: string }> {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/${slug}`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) return { error: data.error ?? `서버 오류 (HTTP ${res.status})` };
  return {};
}

// ── Auth ──────────────────────────────────────────────────────────────────────

export interface AdminLoginResult {
  profile: Record<string, unknown> | null;
  accessToken: string | null;  // custom JWT for Supabase client (RLS auth)
  sessionToken: string | null; // hex token for Edge Function calls (admin only)
  error: string | null;
}

export async function adminLogin(phone: string, password: string): Promise<AdminLoginResult> {
  try {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/admin-login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'apikey': ANON_KEY },
      body: JSON.stringify({ phone, password }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.profile) {
      return { profile: null, accessToken: null, sessionToken: null, error: data.error ?? '인증 실패' };
    }
    return {
      profile: data.profile,
      accessToken: data.accessToken ?? null,
      sessionToken: data.sessionToken ?? null,
      error: null,
    };
  } catch {
    return { profile: null, accessToken: null, sessionToken: null, error: '서버 연결에 실패했습니다.' };
  }
}

export async function adminLogout(): Promise<void> {
  const token = getSessionToken();
  if (!token) return;
  // Fire-and-forget: invalidate session token server-side
  fetch(`${SUPABASE_URL}/functions/v1/admin-login`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ action: 'logout' }),
  }).catch(() => {});
}

// ── Financial data read (secure) ──────────────────────────────────────────────

export interface CapacityConfig {
  sessionTime: number | null;
  desiredHours: number | null;
  maxHours: number | null;
}

export interface FinancialDataResult {
  events: unknown[];
  biConfig: { fixedCost: string; targetRevenue: string } | null;
  capacityConfig: CapacityConfig | null;
  error?: string;
}

export async function fetchFinancialData(): Promise<FinancialDataResult> {
  try {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/financial-data-read`, {
      method: 'GET',
      headers: authHeaders(),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { events: [], biConfig: null, capacityConfig: null, error: data.error };
    return {
      events: data.events ?? [],
      biConfig: data.biConfig ?? null,
      capacityConfig: data.capacityConfig ?? null,
    };
  } catch {
    return { events: [], biConfig: null, capacityConfig: null, error: '재무 데이터 로드 실패' };
  }
}

// ── Financial event writes ─────────────────────────────────────────────────────

export async function insertFinancialEvent(payload: {
  type: 'revenue' | 'cost';
  amount: number;
  source: string;
  note?: string;
  student_id?: string;
}): Promise<{ error?: string }> {
  return callEdgeFn('financial-event-write', { action: 'insert', ...payload });
}

export async function cancelFinancialEvent(event_id: string): Promise<{ error?: string }> {
  return callEdgeFn('financial-event-write', { action: 'cancel', event_id });
}

// ── BI config write ───────────────────────────────────────────────────────────

export async function saveBiConfig(
  fixedCost: string,
  targetRevenue: string,
): Promise<{ error?: string }> {
  return callEdgeFn('bi-config-write', { fixedCost, targetRevenue });
}

// ── Capacity config write ─────────────────────────────────────────────────────

export async function saveCapacityConfig(
  sessionTime: number | null,
  desiredHours: number | null,
  maxHours: number | null,
): Promise<{ error?: string }> {
  return callEdgeFn('bi-config-write', { action: 'capacity', sessionTime, desiredHours, maxHours });
}
