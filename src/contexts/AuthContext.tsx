import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { supabase, setSupabaseJwt, type Profile } from '../lib/supabase';
import { adminLogin, adminLogout, storeSessionToken } from '../lib/adminApi';

interface AuthContextType {
  profile: Profile | null;
  loading: boolean;
  signIn: (phone: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => void;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);
const SESSION_KEY = 'midilab_session';
const ACCESS_TOKEN_KEY = 'midilab_access_token';

function isJwtExpired(jwt: string): boolean {
  try {
    const payload = jwt.split('.')[1];
    const decoded = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')));
    return typeof decoded.exp === 'number' && decoded.exp < Math.floor(Date.now() / 1000);
  } catch {
    return true;
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const profileIdRef = useRef<string | null>(null);

  function clearLocalSession() {
    localStorage.removeItem(SESSION_KEY);
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    storeSessionToken(null);
    profileIdRef.current = null;
    setProfile(null);
    // Swap the Supabase client back to the unauthenticated (anon) instance.
    setSupabaseJwt(null);
  }

  // Startup: check localStorage for a valid JWT, reinitialize the Supabase
  // client first, then verify the profile row is still active in the DB.
  useEffect(() => {
    const storedSession = localStorage.getItem(SESSION_KEY);
    const storedJwt = localStorage.getItem(ACCESS_TOKEN_KEY);

    if (!storedSession || !storedJwt || isJwtExpired(storedJwt)) {
      // No session or JWT has expired — require fresh login.
      clearLocalSession();
      setLoading(false);
      return;
    }

    let parsed: Profile | null = null;
    try { parsed = JSON.parse(storedSession); } catch { /* malformed */ }

    if (!parsed) {
      clearLocalSession();
      setLoading(false);
      return;
    }

    // Reinitialize the Supabase client with the JWT BEFORE the DB check
    // so RLS policies receive a valid Bearer token.
    setSupabaseJwt(storedJwt);

    supabase
      .from('profiles')
      .select('id, status')
      .eq('id', parsed.id)
      .maybeSingle()
      .then(({ data, error }) => {
        if (error) {
          // Network error: cannot confirm — keep session
          setProfile(parsed);
        } else if (!data || data.status !== 'active') {
          clearLocalSession();
        } else {
          profileIdRef.current = parsed!.id;
          setProfile(parsed);
        }
        setLoading(false);
      });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Realtime: watch for profile updates / deletions while logged in.
  useEffect(() => {
    if (!profile?.id) return;

    const watchId = profile.id;

    const ch = supabase
      .channel(`profile-watch-${watchId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'profiles', filter: `id=eq.${watchId}` },
        ({ new: updated }) => {
          if (profileIdRef.current !== watchId) return;
          if (!updated || (updated as Profile).status !== 'active') {
            clearLocalSession();
            return;
          }
          const { password: _pw, ...safeNext } = updated as Profile;
          setProfile(safeNext as Profile);
          localStorage.setItem(SESSION_KEY, JSON.stringify(safeNext));
        }
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'profiles', filter: `id=eq.${watchId}` },
        () => { if (profileIdRef.current === watchId) clearLocalSession(); }
      )
      .subscribe();

    return () => { supabase.removeChannel(ch); };
  }, [profile?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  async function refreshProfile() {
    if (!profile) return;

    const { data, error } = await supabase
      .from('profiles')
      .select('id, full_name, role, status, phone, tickets, points, inventory,expiry_date, payment_amount, unit_price, memo, discord_webhook, created_at, updated_at')
      .eq('id', profile.id)
      .maybeSingle();

    if (error) return;

    if (!data || data.status !== 'active') {
      clearLocalSession();
      return;
    }

    profileIdRef.current = data.id;
    setProfile(data);
    localStorage.setItem(SESSION_KEY, JSON.stringify(data));
  }

  async function signIn(phone: string, password: string) {
    const { profile: result, accessToken, sessionToken, error } = await adminLogin(
      phone.trim(),
      password.trim(),
    );

    if (error || !result) return { error: error ?? '인증 실패' };

    if (!accessToken) return { error: '서버에서 인증 토큰을 받지 못했습니다.' };

    // Reinitialize the Supabase client with the issued JWT so every subsequent
    // supabase.from(...) call carries the correct Authorization header.
    setSupabaseJwt(accessToken);
    localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);

    if (sessionToken) storeSessionToken(sessionToken);

    const { password: _pw, ...safeResult } = result as unknown as Profile;
    const typedProfile = safeResult as Profile;
    profileIdRef.current = typedProfile.id;
    setProfile(typedProfile);
    localStorage.setItem(SESSION_KEY, JSON.stringify(typedProfile));

    return { error: null };
  }

  async function signOut() {
    await adminLogout();
    clearLocalSession();
  }

  return (
    <AuthContext.Provider value={{ profile, loading, signIn, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
