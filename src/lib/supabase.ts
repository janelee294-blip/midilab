import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

// Build a Supabase client.  When jwt is provided it is injected as a static
// Authorization header, which PostgREST forwards to RLS as request.jwt.claims.
// No fetch interception — just a plain header at construction time.
function buildClient(jwt: string | null) {
  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    ...(jwt
      ? { global: { headers: { Authorization: `Bearer ${jwt}` } } }
      : {}),
  });
}

// The live client.  Replaced (not mutated) whenever the JWT changes.
let _current = buildClient(null);

// Swap the live client for one that carries the new JWT in every request.
// Called immediately after login and during startup session restore.
export function setSupabaseJwt(jwt: string | null): void {
  _current = buildClient(jwt);
}

// Stable export: a Proxy that always forwards to the live _current instance.
// All existing  supabase.from(...) / supabase.auth.* / supabase.channel(...)
// calls continue to work without any import changes.
export const supabase = new Proxy({} as typeof _current, {
  get(_t, prop) {
    const val = (_current as any)[prop];
    return typeof val === 'function' ? val.bind(_current) : val;
  },
  set(_t, prop, value) {
    (_current as any)[prop] = value;
    return true;
  },
});

export type UserRole = 'admin' | 'student';
export type UserStatus = 'pending' | 'active' | 'suspended';

export interface RoomLayoutItem {
  pos_x: number;
  pos_y: number;
  pos_z: number;
  rot_y: number;
}

export interface Profile {
  id: string;
  full_name: string;
  role: UserRole;
  status: UserStatus;
  phone: string;
  password?: string;
  tickets: number;
  points: number;
  inventory: Record<string, number>;
  room_layout: Record<string, RoomLayoutItem>;
  expiry_date: string | null;
  payment_amount: number;
  unit_price: number;
  memo: string | null;
  discord_webhook: string | null;
  created_at: string;
  updated_at: string;
}

export interface Product {
  id: string;
  name: string;
  total_price: number;
  unit_price: number;
  tickets: number;
  is_active: boolean;
  sort_order: number;
  duration_days: number | null;
  parent_id: string | null;
  select_type: 'single' | 'multiple';
  is_project_work: boolean;
  expose_on_signup: boolean;
  expose_on_re_reg: boolean;
  created_at: string;
}

export interface LessonApplication {
  id: string;
  full_name: string;
  phone: string;
  age: string;
  experience: string;
  goals: string;
  preferred_schedule: string;
  questions: string;
  status: 'waiting' | 'approved' | 'rejected';
  user_id: string | null;
  memo: string | null;
  product_id: string | null;
  created_at: string;
}

export interface TimeSlot {
  id: string;
  slot_date: string;
  start_time: string;
  end_time: string;
  is_available: boolean;
  is_customized: boolean;
  booked_by: string | null;
  created_at: string;
}

export interface WeeklyTemplate {
  id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  created_at: string;
}

export interface Reservation {
  id: string;
  user_id: string;
  slot_id: string;
  status: 'confirmed' | 'cancelled' | 'completed' | 'noshow';
  cancelled_at: string | null;
  penalty_points: number;
  ticket_refunded: boolean;
  created_at: string;
  time_slots?: TimeSlot;
  profiles?: Profile;
}

export interface Extension {
  id: string;
  user_id: string;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  days_requested: number;
  admin_note: string | null;
  created_at: string;
  resolved_at: string | null;
  profiles?: Profile;
}

export interface Registration {
  id: string;
  student_id: string;
  product_id: string;
  status: 'pending' | 'approved' | 'rejected';
  selected_options: string[];
  total_price: number;
  created_at: string;
  profiles?: Profile;
  products?: Product;
}

export interface ProjectWork {
  id: string;
  registration_id: string;
  student_id: string;
  student_name: string;
  product_name: string;
  price: number;
  status: string;
  created_at: string;
}

export interface PointsHistory {
  id: string;
  user_id: string;
  delta: number;
  reason: string;
  created_at: string;
}

export interface RankingBackup {
  id: string;
  user_id: string;
  full_name: string;
  points: number;
  rank_position: number | null;
  snapshot_month: string;
  created_at: string;
}

export interface Notification {
  id: string;
  type: string;
  title: string;
  body: string;
  user_id: string | null;
  is_read: boolean;
  created_at: string;
}
