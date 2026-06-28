import React, { useState } from 'react';
import { Lock, Eye, EyeOff, CheckCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../ui/Button';

export function PasswordChange({ theme = 'light' }: { theme?: 'light' | 'dark' }) {
  const { profile, signOut } = useAuth();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNext, setShowNext] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (next.length < 4) { setError('새 비밀번호는 4자 이상이어야 합니다.'); return; }
    if (next !== confirm) { setError('새 비밀번호가 일치하지 않습니다.'); return; }
    if (!profile) { setError('로그인 정보를 확인할 수 없습니다.'); return; }

    setLoading(true);

    const { data: valid } = await supabase.rpc('verify_current_password', {
      p_user_id: profile.id,
      p_password: current.trim(),
    });
    if (!valid) {
      setError('현재 비밀번호가 올바르지 않습니다.');
      setLoading(false);
      return;
    }

    const { error: updateErr } = await supabase
      .from('profiles')
      .update({ password: next.trim() })
      .eq('id', profile.id);

    if (updateErr) { setError(updateErr.message); setLoading(false); return; }

    setSuccess(true);
    setCurrent(''); setNext(''); setConfirm('');
    setLoading(false);
    setTimeout(() => { setSuccess(false); signOut(); }, 2000);
  }

  const isDark = theme === 'dark';

  return (
    <div className={`rounded-2xl border p-6 ${isDark ? 'bg-[#141b2d] border-[#1e2940]' : 'bg-white border-slate-200'}`}>
      <h3 className={`font-semibold mb-4 flex items-center gap-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
        <Lock size={16} className={isDark ? 'text-[#334155]' : 'text-slate-500'} />
        비밀번호 변경
      </h3>

      {success && (
        <div className={`mb-4 flex items-center gap-2 rounded-xl px-4 py-3 text-sm border ${isDark
          ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
          : 'bg-emerald-50 border-emerald-200 text-emerald-800'}`}>
          <CheckCircle size={16} />
          비밀번호가 변경되었습니다. 다시 로그인해주세요.
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <p className={`text-sm ${isDark ? 'text-red-400' : 'text-red-600'}`}>{error}</p>}

        {[
          { label: '현재 비밀번호', value: current, set: setCurrent, show: showCurrent, toggle: () => setShowCurrent(v => !v) },
          { label: '새 비밀번호', value: next, set: setNext, show: showNext, toggle: () => setShowNext(v => !v) },
          { label: '새 비밀번호 확인', value: confirm, set: setConfirm, show: showNext, toggle: () => setShowNext(v => !v) },
        ].map(({ label, value, set, show, toggle }) => (
          <div key={label}>
            <label className={`text-sm font-medium block mb-1.5 ${isDark ? 'text-[#8fa0dd]' : 'text-slate-700'}`}>{label}</label>
            <div className="relative">
              <input
                type={show ? 'text' : 'password'}
                value={value}
                onChange={(e) => set(e.target.value)}
                required
                className={`w-full px-3 py-2.5 pr-10 rounded-xl text-sm focus:outline-none transition-all ${isDark
                  ? 'bg-[#0b0f19] border border-[#1e2940] text-white placeholder-[#334155] focus:border-[#22d3ee] focus:ring-1 focus:ring-[#22d3ee]/30'
                  : 'border border-slate-300 focus:ring-2 focus:ring-slate-500'}`}
              />
              <button type="button" onClick={toggle} className={`absolute right-3 top-1/2 -translate-y-1/2 transition-colors ${isDark ? 'text-[#334155] hover:text-[#8fa0dd]' : 'text-slate-400 hover:text-slate-600'}`}>
                {show ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>
        ))}

        <Button type="submit" variant={isDark ? 'cyan' : 'primary'} loading={loading} className="w-full justify-center">
          비밀번호 변경
        </Button>
      </form>
    </div>
  );
}
