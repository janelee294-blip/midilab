import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Eye, EyeOff, Phone, AlertCircle, CheckCircle, Lock, X, ChevronDown, Mic, SlidersHorizontal, Upload } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase, type Product } from '../lib/supabase';
import { Logo } from '../components/shared/Logo';
import { sendDiscordNotification, DISCORD_COLORS } from '../lib/discord';

// ── Particle canvas ──────────────────────────────────────────────────
interface Particle {
  x: number; y: number;
  vx: number; vy: number;
  r: number;
  color: string;
  opacity: number;
  phase: number;
}

function useParticleCanvas(canvasRef: React.RefObject<HTMLCanvasElement>) {
  const mouse = useRef({ x: -999, y: -999 });
  const particles = useRef<Particle[]>([]);
  const raf = useRef<number>(0);

  const init = useCallback((w: number, h: number) => {
    const colors = ['#22d3ee', '#a855f7', '#818cf8'];
    particles.current = Array.from({ length: 80 }, () => ({
      x: Math.random() * w,
      y: Math.random() * h,
      vx: (Math.random() - 0.5) * 0.35,
      vy: (Math.random() - 0.5) * 0.35,
      r: Math.random() * 1.5 + 0.5,
      color: colors[Math.floor(Math.random() * colors.length)],
      opacity: Math.random() * 0.5 + 0.15,
      phase: Math.random() * Math.PI * 2,
    }));
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;

    const resize = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
      init(canvas.width, canvas.height);
    };

    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    resize();

    const onMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouse.current = { x: e.clientX - rect.left, y: e.clientY - rect.top + window.scrollY };
    };
    window.addEventListener('mousemove', onMove);

    let t = 0;
    const draw = () => {
      const { width: w, height: h } = canvas;
      ctx.clearRect(0, 0, w, h);
      t += 0.008;

      for (const p of particles.current) {
        // Mouse repulsion
        const dx = p.x - mouse.current.x;
        const dy = p.y - mouse.current.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 120) {
          const force = (120 - dist) / 120 * 0.6;
          p.vx += (dx / dist) * force * 0.04;
          p.vy += (dy / dist) * force * 0.04;
        }

        // Damping + gentle drift
        p.vx *= 0.985;
        p.vy *= 0.985;
        p.x += p.vx;
        p.y += p.vy;

        // Wrap
        if (p.x < -10) p.x = w + 10;
        if (p.x > w + 10) p.x = -10;
        if (p.y < -10) p.y = h + 10;
        if (p.y > h + 10) p.y = -10;

        // Draw particle
        const alpha = p.opacity * (0.6 + 0.4 * Math.sin(t + p.phase));
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = p.color + Math.round(alpha * 255).toString(16).padStart(2, '0');
        ctx.fill();
      }

      // Draw connections
      for (let i = 0; i < particles.current.length; i++) {
        for (let j = i + 1; j < particles.current.length; j++) {
          const a = particles.current[i];
          const b = particles.current[j];
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const d = Math.sqrt(dx * dx + dy * dy);
          if (d < 100) {
            const alpha = (1 - d / 100) * 0.12;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.strokeStyle = `rgba(34,211,238,${alpha})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        }
      }

      raf.current = requestAnimationFrame(draw);
    };
    draw();

    return () => {
      cancelAnimationFrame(raf.current);
      ro.disconnect();
      window.removeEventListener('mousemove', onMove);
    };
  }, [init, canvasRef]);
}

// ── Scroll reveal hook ───────────────────────────────────────────────
function useReveal(ref: React.RefObject<HTMLElement>) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setVisible(true); obs.disconnect(); } }, { threshold: 0.08, rootMargin: '0px 0px -8% 0px' });
    obs.observe(el);
    return () => obs.disconnect();
  }, [ref]);
  return visible;
}

// ── Section reveal wrapper ───────────────────────────────────────────
function Reveal({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const visible = useReveal(ref as React.RefObject<HTMLElement>);
  return (
    <div ref={ref} data-reveal-visible={visible} style={{ transitionDelay: `${delay}ms` }}
      className={`transition-[opacity,transform] duration-[720ms] ease-[cubic-bezier(0.22,1,0.36,1)] ${visible ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-6 scale-[0.99]'}`}>
      {children}
    </div>
  );
}

const FIRST_MONTH_PRICES: Readonly<Record<number, number>> = {
  4: 190000,
  8: 320000,
};

const LESSON_PLANS = [
  {
    tickets: 4,
    name: '월 4회 과정',
    detail: '주 1회 · 총 4회 · 회당 60분',
    description: '꾸준히 배우며 자작곡 제작의 기초를 쌓는 과정',
    originalPrice: 240000,
    price: FIRST_MONTH_PRICES[4],
    normalPriceNote: '이후 월 240,000원',
    featured: false,
  },
  {
    tickets: 8,
    name: '월 8회 집중 과정',
    detail: '주 2회 · 총 8회 · 회당 60분',
    description: '제작량을 빠르게 늘리고 자작곡을 집중적으로 완성하는 과정',
    originalPrice: 400000,
    price: FIRST_MONTH_PRICES[8],
    normalPriceNote: '이후 월 400,000원',
    featured: true,
  },
] as const;

function formatWon(amount: number) {
  return `${amount.toLocaleString()}원`;
}

// ── Application form ─────────────────────────────────────────────────
interface AppFormProps { onClose: () => void }

function ApplicationForm({ onClose }: AppFormProps) {
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [formError, setFormError] = useState('');
  const [appName, setAppName] = useState('');
  const [appPhone, setAppPhone] = useState('');
  const [appAge, setAppAge] = useState('');
  const [appGender, setAppGender] = useState('');
  const [appLessonType, setAppLessonType] = useState('');
  const [appExperience, setAppExperience] = useState('');
  const [appGoals, setAppGoals] = useState<string[]>([]);
  const [appGoalOther, setAppGoalOther] = useState('');
  const [appGenre, setAppGenre] = useState('');
  const [appReferrer, setAppReferrer] = useState('');
  const [appExtra, setAppExtra] = useState('');
  const [appProductId, setAppProductId] = useState('');
  const [policyAgreed, setPolicyAgreed] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);

  useEffect(() => {
    supabase.from('products').select('*').eq('is_active', true).eq('expose_on_signup', true)
      .order('sort_order').order('created_at')
      .then(({ data }) => setProducts(data || []));
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError('');
    setSubmitting(true);
    const finalGoal = appGoals.map(g => g === '기타' ? `기타: ${appGoalOther}` : g).join(', ');
    try {
      const { error: dbError } = await supabase.from('lesson_applications').insert({
        full_name: appName, phone: appPhone, age: appAge,
        experience: `[성별: ${appGender}] ${appExperience}`,
        goals: finalGoal, preferred_schedule: appLessonType,
        questions: `[장르/레퍼런스] ${appGenre}\n[추천인] ${appReferrer}\n[전달할 말] ${appExtra}`,
        status: 'waiting', product_id: appProductId || null,
      });
      if (dbError) throw dbError;
      await sendDiscordNotification('신규 레슨 신청',
        `**이름:** ${appName}\n**연락처:** ${appPhone}\n**수업방식:** ${appLessonType}\n**목적:** ${finalGoal}`,
        DISCORD_COLORS.INFO);
      setSubmitted(true);
    } catch (err: any) {
      setFormError(err.message || '신청 중 오류가 발생했습니다.');
    } finally {
      setSubmitting(false);
    }
  }

  const GOALS = ['취미로 내 음악 한 곡 만들기', '작곡·편곡 기초 다지기', '보컬·악기 녹음 및 믹싱', 'K-POP 데모 제작 및 프로 작곡가 준비', '기타'];
  const inputCls = "w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-cyan-400/40 transition-all text-sm";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/75 backdrop-blur-md" onClick={() => !submitting && onClose()} />
      <div className="relative w-full max-w-xl bg-[#0d1117] border border-white/10 rounded-3xl shadow-2xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-7 py-5 border-b border-white/10 flex-shrink-0">
          <div>
            <h2 className="text-lg font-bold text-white">레슨 신청서</h2>
            {!submitted && <p className="text-slate-500 text-xs mt-0.5">모든 내용을 성실히 작성해주세요</p>}
          </div>
          {!submitting && (
            <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors p-1">
              <X size={18} />
            </button>
          )}
        </div>

        <div className="overflow-y-auto flex-1 px-7 py-5">
          {submitted ? (
            <div className="text-center py-12">
              <CheckCircle size={52} className="text-emerald-400 mx-auto mb-4" />
              <h3 className="text-lg font-bold text-white mb-2">신청이 완료되었습니다!</h3>
              <p className="text-slate-400 text-sm leading-relaxed">관리자 확인 후 안내드리겠습니다.<br />승인 완료 시 로그인하여 이용하실 수 있습니다.</p>
              <button onClick={onClose}
                className="mt-6 px-6 py-2.5 bg-gradient-to-r from-cyan-500 to-purple-600 text-white font-semibold rounded-xl transition-all text-sm hover:opacity-90">
                닫기
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              {formError && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-300 rounded-xl px-4 py-3 text-sm">{formError}</div>
              )}

              <div>
                <label className="text-xs font-medium text-slate-400 block mb-1.5">수강 희망 상품 <span className="text-cyan-400">*</span></label>
                <select required value={appProductId} onChange={e => setAppProductId(e.target.value)}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-cyan-400/40">
                  <option value="" disabled className="bg-slate-900 text-slate-400">상품을 선택해주세요</option>
                  {products.map(p => {
                    const firstMonthPrice = FIRST_MONTH_PRICES[p.tickets];
                    return (
                      <option key={p.id} value={p.id} className="bg-slate-900 text-white">
                        {p.name} — {firstMonthPrice ? `첫 달 ${formatWon(firstMonthPrice)}` : formatWon(p.total_price)} / {p.tickets}회
                      </option>
                    );
                  })}
                </select>
                <p className="mt-1.5 text-[11px] text-slate-600">첫 등록 할인은 신청 승인 후 적용됩니다.</p>
              </div>

              <div>
                <label className="text-xs font-medium text-slate-400 block mb-1.5">이름 <span className="text-cyan-400">*</span></label>
                <input type="text" value={appName} onChange={e => setAppName(e.target.value)} required placeholder="홍길동" className={inputCls} />
              </div>

              <div>
                <label className="text-xs font-medium text-slate-400 block mb-1.5">연락처 <span className="text-cyan-400">*</span></label>
                <input type="tel" value={appPhone} onChange={e => setAppPhone(e.target.value)} required placeholder="010-0000-0000" className={inputCls} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-slate-400 block mb-1.5">나이 <span className="text-cyan-400">*</span></label>
                  <input type="text" value={appAge} onChange={e => setAppAge(e.target.value)} required placeholder="예: 25" className={inputCls} />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-400 block mb-2">성별 <span className="text-cyan-400">*</span></label>
                  <div className="flex gap-2">
                    {['남성', '여성'].map(g => (
                      <button key={g} type="button" onClick={() => setAppGender(g)}
                        className={`flex-1 py-3 rounded-xl border text-sm font-medium transition-all ${appGender === g ? 'bg-cyan-400/15 border-cyan-400/50 text-cyan-300' : 'bg-white/5 border-white/10 text-slate-400 hover:border-white/20'}`}>
                        {g}
                      </button>
                    ))}
                  </div>
                  <input type="hidden" required value={appGender} onChange={() => {}} />
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-slate-400 block mb-2">희망 수업 방식 <span className="text-cyan-400">*</span></label>
                <div className="flex gap-2">
                  {['대면', '비대면', '혼합'].map(t => (
                    <button key={t} type="button" onClick={() => setAppLessonType(t)}
                      className={`flex-1 py-2.5 rounded-xl border text-sm font-medium transition-all ${appLessonType === t ? 'bg-cyan-400/15 border-cyan-400/50 text-cyan-300' : 'bg-white/5 border-white/10 text-slate-400 hover:border-white/20'}`}>
                      {t}
                    </button>
                  ))}
                </div>
                <input type="hidden" required value={appLessonType} onChange={() => {}} />
              </div>

              <div>
                <label className="text-xs font-medium text-slate-400 block mb-1.5">음악 배경 및 경험 <span className="text-cyan-400">*</span></label>
                <textarea value={appExperience} onChange={e => setAppExperience(e.target.value)} required rows={4}
                  placeholder="음악 공부 경험, 사용해 본 시퀀서와 숙련도, 다룰 수 있는 악기나 컴퓨터 사양(Mac/Windows 등), 보유 중인 음악 장비 등 편하게 적어주세요."
                  className={`${inputCls} resize-none`} />
              </div>

              <div>
                <label className="text-xs font-medium text-slate-400 block mb-2">레슨 목적 <span className="text-cyan-400">*</span></label>
                <div className="space-y-2">
                  {GOALS.map(opt => {
                    const checked = appGoals.includes(opt);
                    const toggle = () => setAppGoals(prev => checked ? prev.filter(g => g !== opt) : [...prev, opt]);
                    return (
                      <label key={opt} className="flex items-center gap-3 cursor-pointer group">
                        <div onClick={toggle}
                          className={`w-4 h-4 rounded border-2 flex-shrink-0 flex items-center justify-center transition-all ${checked ? 'bg-cyan-400 border-cyan-400' : 'border-white/20 group-hover:border-white/40'}`}>
                          {checked && <svg className="w-2.5 h-2.5 text-slate-900" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
                        </div>
                        <span className={`text-sm transition-colors ${checked ? 'text-white' : 'text-slate-400'}`}>{opt}</span>
                        {opt === '기타' && checked && (
                          <input type="text" value={appGoalOther} onChange={e => setAppGoalOther(e.target.value)} required
                            placeholder="직접 입력" autoFocus
                            className="flex-1 px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-cyan-400/40 text-sm" />
                        )}
                      </label>
                    );
                  })}
                </div>
                <input type="hidden" required value={appGoals.join(',')} onChange={() => {}} />
              </div>

              <div>
                <label className="text-xs font-medium text-slate-400 block mb-1.5">좋아하는 장르 / 레퍼런스 곡 <span className="text-cyan-400">*</span></label>
                <textarea value={appGenre} onChange={e => setAppGenre(e.target.value)} required rows={2}
                  placeholder="예: K-POP, 팝, EDM / 좋아하는 곡이나 아티스트"
                  className={`${inputCls} resize-none`} />
              </div>

              <div>
                <label className="text-xs font-medium text-slate-400 block mb-1.5">추천인 이름 <span className="text-slate-600">(선택)</span></label>
                <input type="text" value={appReferrer} onChange={e => setAppReferrer(e.target.value)}
                  placeholder="추천인의 이름을 적어주시면 두 분 모두에게 이벤트 혜택이 적용됩니다."
                  className={inputCls} />
              </div>

              <div>
                <label className="text-xs font-medium text-slate-400 block mb-1.5">전달하고 싶은 말 <span className="text-slate-600">(선택)</span></label>
                <textarea value={appExtra} onChange={e => setAppExtra(e.target.value)} rows={3}
                  placeholder="궁금한 점이나 전하고 싶은 내용을 자유롭게 적어주세요"
                  className={`${inputCls} resize-none`} />
              </div>

              <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-4 space-y-3">
                <p className="text-xs font-semibold text-slate-300">레슨 정책</p>
                <ol className="space-y-2 text-xs text-slate-500 list-decimal list-inside leading-relaxed">
                  <li><span className="text-slate-400 font-medium">(수업 기한 및 환불)</span> 레슨 티켓의 기본 사용기간은 30일입니다. 개인수업 특성상 전체 수업의 절반 이상을 진행한 이후에는 중도 환불이 어렵습니다.</li>
                  <li><span className="text-slate-400 font-medium">(예약 변경)</span> 원활한 스케줄 관리를 위해 예약 변경은 수업 3일 전까지 부탁드립니다.</li>
                  <li><span className="text-slate-400 font-medium">(당일 취소 및 노쇼)</span> 당일 취소나 무단 노쇼 시에는 레슨 티켓 1장이 자동 차감됩니다.</li>
                </ol>
                <label className="flex items-start gap-3 cursor-pointer mt-1">
                  <div className="relative flex-shrink-0">
                    <input type="checkbox" required checked={policyAgreed} onChange={e => setPolicyAgreed(e.target.checked)}
                      className="opacity-0 absolute inset-0 w-4 h-4 cursor-pointer" />
                    <div className={`w-4 h-4 mt-0.5 rounded border-2 flex items-center justify-center transition-all pointer-events-none ${policyAgreed ? 'bg-cyan-400 border-cyan-400' : 'border-white/20'}`}>
                      {policyAgreed && <svg className="w-2.5 h-2.5 text-slate-900" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
                    </div>
                  </div>
                  <span className="text-xs text-slate-400">위 레슨 정책을 확인했으며, 이에 동의합니다.</span>
                </label>
              </div>

              <button type="submit" disabled={submitting}
                className="w-full py-3.5 bg-gradient-to-r from-cyan-500 to-purple-600 hover:opacity-90 disabled:opacity-40 text-white font-bold rounded-xl transition-all text-sm flex items-center justify-center gap-2 shadow-[0_0_24px_rgba(34,211,238,0.2)]">
                {submitting ? (
                  <><svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>제출 중...</>
                ) : '신청서 제출하기'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Login modal ──────────────────────────────────────────────────────
interface LoginModalProps { onClose: () => void }

function LoginModal({ onClose }: LoginModalProps) {
  const { signIn } = useAuth();
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    const { error: err } = await signIn(phone, password);
    if (err) setError(err);
    setLoading(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/75 backdrop-blur-md" onClick={() => !loading && onClose()} />
      <div className="relative w-full max-w-sm bg-[#0d1117] border border-white/10 rounded-3xl shadow-2xl p-8">
        <button onClick={onClose} className="absolute top-4 right-4 text-slate-500 hover:text-white transition-colors">
          <X size={18} />
        </button>
        <div className="flex justify-center mb-6">
          <Logo theme="dark" size="md" />
        </div>
        <h2 className="text-lg font-bold text-white text-center mb-1">수강생 로그인</h2>
        <p className="text-slate-500 text-xs text-center mb-6">등록된 전화번호와 비밀번호를 입력해주세요</p>

        {error && (
  <div className="mb-4 flex items-center gap-2 bg-red-500/10 border border-red-500/20 text-red-300 rounded-xl px-4 py-3 overflow-hidden">
    <AlertCircle size={14} className="shrink-0" />
    <span className="text-[13px] whitespace-nowrap">
      {error}
    </span>
  </div>
)}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="text-[11px] font-medium text-slate-500 uppercase tracking-wider block mb-1.5">전화번호</label>
            <div className="relative">
              <Phone size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-600" />
              <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="010-0000-0000"
                className="w-full pl-10 pr-4 py-2.5 bg-white/[0.04] border border-white/[0.08] rounded-xl text-white text-sm placeholder-slate-700 focus:outline-none focus:border-cyan-500/50 focus:bg-white/[0.06] transition-all" />
            </div>
          </div>
          <div>
            <label className="text-[11px] font-medium text-slate-500 uppercase tracking-wider block mb-1.5">비밀번호</label>
            <div className="relative">
              <input type={showPw ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" required
                className="w-full px-4 py-2.5 pr-11 bg-white/[0.04] border border-white/[0.08] rounded-xl text-white text-sm placeholder-slate-700 focus:outline-none focus:border-cyan-500/50 focus:bg-white/[0.06] transition-all" />
              <button type="button" onClick={() => setShowPw(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-600 hover:text-slate-400 transition-colors">
                {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>
          <button type="submit" disabled={loading}
            className="w-full py-2.5 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-cyan-500 to-purple-600 hover:opacity-90 disabled:opacity-40 transition-all flex items-center justify-center gap-2 shadow-[0_1px_24px_rgba(34,211,238,0.18)]">
            {loading ? <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg> : <Lock size={14} />}
            {loading ? '로그인 중...' : '로그인'}
          </button>
        </form>
      </div>
    </div>
  );
}

// ── Landing content ──────────────────────────────────────────────────
const WORK_VIDEOS = [
  { title: 'Remix', videoUrl: '', posterUrl: '', accent: 'from-cyan-500/30 via-blue-500/10 to-transparent' },
  { title: 'Instrument Loop', videoUrl: '', posterUrl: '', accent: 'from-purple-500/30 via-fuchsia-500/10 to-transparent' },
  { title: 'Original Production', videoUrl: '', posterUrl: '', accent: 'from-cyan-400/20 via-purple-500/15 to-transparent' },
] as const;

const PLATFORM_FEATURES = [
  {
    title: '언제든 다시 보는 기초 강의',
    description: '수업에서 놓친 개념은 짧은 영상으로 다시 확인하고, 필요한 내용을 원하는 만큼 반복해서 볼 수 있습니다.',
    imageSrc: '/landing/lecture.png',
  },
  {
    title: '음악 챌린지',
    description: '드럼, 피아노, 베이스, 단축키와 음악 감각을 짧은 미션으로 반복 훈련하고 포인트를 얻습니다.',
    imageSrc: '/landing/challenge.png',
  },
  {
    title: '매주 과제로 레슨비 할인',
    description: '매주 과제를 완료할 때마다 다음 결제에서 20,000원씩 할인됩니다. 월 4개 과제를 모두 완료하면 최대 80,000원까지 할인받을 수 있습니다.',
    imageSrc: '/landing/reward.png',
  },
  {
    title: '포인트로 꾸미는 3D 작업실',
    description: '챌린지와 배틀 등 포인트 지급 활동으로 얻은 포인트로 아이템을 구매해 수강생 전용 3D 작업실을 자유롭게 꾸밀 수 있습니다.',
    imageSrc: '/landing/studio.png',
  },
] as const;

const WHY_ITEMS = [
  {
    icon: <svg className="w-6 h-6 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h10M4 18h7" /></svg>,
    title: '복잡한 내용을 구조로 정리합니다',
    body: '필요한 이론과 기능을 무작정 나열하지 않습니다. 지금 목표에 필요한 내용을 이해하기 쉬운 순서로 연결합니다.',
  },
  {
    icon: <svg className="w-6 h-6 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M11.25 4.5l7.5 7.5-7.5 7.5M5.25 12h13.5" /></svg>,
    title: '막히는 원인을 바로 찾아냅니다',
    body: '소리가 왜 어색한지, 무엇을 먼저 고쳐야 하는지, 다음 단계로 어떻게 넘어갈지를 실제 프로젝트에서 함께 판단합니다.',
  },
  {
    icon: <svg className="w-6 h-6 text-cyan-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 18V5l12-2v13M9 9l12-2M5 21a4 3 0 100-6 4 3 0 000 6zm12-2a4 3 0 100-6 4 3 0 000 6z" /></svg>,
    title: '학생이 원하는 결과물로 배웁니다',
    body: '정해진 예제만 따라 하지 않고, 좋아하는 곡과 만들고 싶은 음악을 중심으로 작곡·편곡·녹음·믹싱을 연결합니다.',
  },
] as const;

const PRODUCTION_OPTIONS = [
  {
    icon: Mic,
    title: '보컬 녹음',
    lines: ['완성된 곡에 필요한 보컬 녹음과', '트랙 정리를 함께 진행합니다.'],
  },
  {
    icon: SlidersHorizontal,
    title: '믹싱 · 마스터링',
    lines: ['각 트랙의 균형을 정리하고', '완성된 음원으로 들릴 수 있게 다듬습니다.'],
  },
  {
    icon: Upload,
    title: '음원 발매',
    lines: ['국내외 음원 플랫폼 유통과', '발매에 필요한 과정을 함께 준비합니다.'],
  },
] as const;

function SectionHeading({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: React.ReactNode;
  description?: React.ReactNode;
}) {
  return (
    <div className="max-w-3xl mx-auto text-center mb-8 sm:mb-20">
      <Reveal delay={0}>
        <span className="text-xs text-cyan-400 tracking-[0.22em] uppercase font-semibold">{eyebrow}</span>
      </Reveal>
      <Reveal delay={80}>
        <h2 className="max-w-[22rem] sm:max-w-none mx-auto text-[1.75rem] sm:text-5xl font-bold mt-2 sm:mt-4 mb-3 sm:mb-5 leading-[1.2] sm:leading-[1.2] tracking-tight break-keep sm:break-normal">{title}</h2>
      </Reveal>
      {description && (
        <Reveal delay={160}>
          <p className="text-slate-400 text-sm sm:text-lg leading-6 sm:leading-relaxed">{description}</p>
        </Reveal>
      )}
    </div>
  );
}

function ValueCard({ icon, title, body, delay }: { icon: React.ReactNode; title: string; body: string; delay: number }) {
  return (
    <Reveal delay={delay}>
      <div className="group h-full relative bg-white/[0.03] md:hover:-translate-y-[3px] md:hover:bg-white/[0.055] border border-white/[0.07] md:hover:border-cyan-400/25 rounded-2xl p-5 sm:p-8 transition-[transform,background-color,border-color] duration-300 backdrop-blur-sm">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500/15 to-purple-500/15 border border-white/[0.08] flex items-center justify-center mb-4 sm:mb-6 group-hover:from-cyan-500/25 group-hover:to-purple-500/25 transition-all duration-300">
          {icon}
        </div>
        <h3 className="text-white font-semibold text-base sm:text-lg mb-3 leading-tight">{title}</h3>
        <p className="text-slate-400 text-sm leading-6 sm:leading-7">{body}</p>
      </div>
    </Reveal>
  );
}

function Divider() {
  return (
    <div className="max-w-5xl mx-auto px-6">
      <div className="h-px bg-gradient-to-r from-transparent via-white/[0.07] to-transparent" />
    </div>
  );
}

// ── Main component ───────────────────────────────────────────────────
export function PremiumLanding() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const heroCtaRef = useRef<HTMLButtonElement>(null);
  const finalCtaRef = useRef<HTMLButtonElement>(null);
  useParticleCanvas(canvasRef);

  const [showLogin, setShowLogin] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [isHeroCtaVisible, setIsHeroCtaVisible] = useState(true);
  const [isFinalCtaVisible, setIsFinalCtaVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    const heroCta = heroCtaRef.current;
    const finalCta = finalCtaRef.current;
    if (!heroCta || !finalCta) return;

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.target === heroCta) setIsHeroCtaVisible(entry.isIntersecting);
        if (entry.target === finalCta) setIsFinalCtaVisible(entry.isIntersecting);
      });
    }, { threshold: 0.01 });

    observer.observe(heroCta);
    observer.observe(finalCta);
    return () => observer.disconnect();
  }, []);

  const showMobileStickyCta = !isHeroCtaVisible && !isFinalCtaVisible && !showForm;

  return (
    <div className="premium-landing min-h-screen bg-[#0A0A0A] text-white overflow-x-hidden pb-[calc(4.75rem+env(safe-area-inset-bottom))] sm:pb-0">
      <style>{`
        @keyframes gradient-shift {
          0%,100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
        .gradient-text {
          background: linear-gradient(90deg, #22d3ee, #a855f7, #22d3ee);
          background-size: 200%;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          animation: gradient-shift 4s ease infinite;
        }
        .cta-btn {
          background: linear-gradient(135deg, #22d3ee, #a855f7);
          background-size: 200% 200%;
          animation: gradient-shift 3s ease infinite;
        }
        .reveal-media {
          opacity: 0;
          transform: scale(1.025);
          transition:
            opacity 900ms cubic-bezier(0.22, 1, 0.36, 1),
            transform 900ms cubic-bezier(0.22, 1, 0.36, 1);
          transition-delay: inherit;
        }
        [data-reveal-visible="true"] .reveal-media {
          opacity: 1;
          transform: scale(1);
        }
        @media (prefers-reduced-motion: reduce) {
          .premium-landing *,
          .premium-landing *::before,
          .premium-landing *::after {
            animation-duration: 0.01ms !important;
            animation-iteration-count: 1 !important;
            transition-duration: 0.01ms !important;
            scroll-behavior: auto !important;
          }
        }
      `}</style>

      <header className={`fixed top-0 left-0 right-0 z-40 transition-all duration-300 ${scrolled ? 'bg-[#0A0A0A]/90 backdrop-blur-xl border-b border-white/[0.06]' : ''}`}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 sm:h-16 flex items-center justify-between gap-3">
          <Logo theme="dark" size="md" />
          <button onClick={() => setShowLogin(true)}
            className="shrink-0 whitespace-nowrap text-[11px] sm:text-sm text-slate-400 hover:text-white border border-white/10 hover:border-white/25 px-2.5 sm:px-4 py-1.5 rounded-full transition-all duration-200">
            기존 수강생 로그인
          </button>
        </div>
      </header>

      {/* 1. Hero */}
      <section className="relative min-h-[100dvh] flex flex-col items-center justify-center px-5 sm:px-6 pt-20 sm:pt-24 pb-16 sm:pb-20">
        <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" style={{ pointerEvents: 'none' }} />
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[min(700px,90vw)] h-[420px] rounded-full"
            style={{ background: 'radial-gradient(ellipse, rgba(34,211,238,0.07) 0%, transparent 70%)' }} />
          <div className="absolute bottom-1/4 right-0 sm:right-1/4 w-[400px] h-[300px] rounded-full"
            style={{ background: 'radial-gradient(ellipse, rgba(168,85,247,0.06) 0%, transparent 70%)' }} />
        </div>

        <div className="relative z-10 text-center max-w-5xl mx-auto">
          <div className="inline-flex max-w-full items-center gap-2 text-[10px] sm:text-xs text-slate-400 border border-white/[0.08] bg-white/[0.03] backdrop-blur-sm rounded-full px-3 sm:px-4 py-2 mb-7 sm:mb-10 leading-5 sm:leading-normal tracking-wider">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
            홍대입구 대면 · Discord 온라인 1:1 미디·작곡 레슨
          </div>

          <h1 className="max-w-[21rem] sm:max-w-none mx-auto text-[1.9rem] sm:text-6xl md:text-7xl font-bold leading-[1.15] sm:leading-[1.12] tracking-[-0.04em] mb-7 sm:mb-8 break-keep sm:break-normal">
            원하는 음악이 있다면,<br className="hidden sm:block" />{' '}
            가장 빠르게 이해하고<br className="hidden sm:block" />{' '}
            <span className="gradient-text">직접 만들 수 있게</span> 가르칩니다.
          </h1>

          <p className="text-slate-400 text-base sm:text-xl max-w-2xl mx-auto mb-10 sm:mb-12 leading-relaxed">
            <span className="block text-slate-200 mb-4">FL Studio · Ableton Live</span>
            완전 초보부터 자작곡, 리믹스, 싱어송라이팅까지<br className="hidden sm:block" />{' '}
            원하는 음악을 직접 만들 수 있도록 1:1로 진행합니다.
          </p>

          <button ref={heroCtaRef} onClick={() => setShowForm(true)}
            className="cta-btn w-full max-w-[280px] sm:w-auto sm:max-w-none min-h-12 px-6 sm:px-8 py-3 sm:py-4 rounded-2xl text-white font-bold text-base shadow-[0_0_32px_rgba(34,211,238,0.25)] hover:shadow-[0_0_48px_rgba(34,211,238,0.35)] transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]">
            무료 테스트 레슨 신청하기
          </button>
        </div>

        <div className="absolute bottom-8 inset-x-0 flex justify-center pointer-events-none">
          <div className="flex flex-col items-center gap-2 text-slate-600 animate-bounce">
            <span className="text-[10px] tracking-widest uppercase">Scroll</span>
            <ChevronDown size={16} />
          </div>
        </div>
      </section>

      {/* 2. Work videos */}
      <section className="py-14 sm:py-32 px-5 sm:px-6">
        <div className="max-w-5xl mx-auto">
          <SectionHeading
            eyebrow="Selected Works"
            title={<>직접 만들고, 연주하고,<br className="hidden sm:block" />{' '}<span className="gradient-text">완성하는 프로듀서</span>에게 배웁니다</>}
            description={<>프로그램 기능만 설명하는 수업이 아니라<br className="hidden sm:block" />{' '}실제 음악을 만드는 과정과 판단을 함께 익힙니다.</>}
          />

          <div className="flex overflow-x-auto snap-x snap-mandatory gap-4 -mx-5 px-5 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden [&>div]:w-[76vw] [&>div]:max-w-[290px] [&>div]:shrink-0 [&>div]:snap-center sm:mx-0 sm:grid sm:grid-cols-3 sm:gap-5 sm:overflow-visible sm:px-0 sm:pb-0 sm:snap-none sm:[&>div]:w-auto sm:[&>div]:max-w-none">
            {WORK_VIDEOS.map((work, index) => (
              <Reveal key={work.title} delay={index * 80}>
                <div className="group relative aspect-[9/16] max-w-sm mx-auto sm:max-w-none overflow-hidden rounded-3xl border border-white/[0.08] bg-[#10131a] shadow-2xl">
                  <div className="reveal-media absolute inset-0">
                    {work.videoUrl ? (
                      <video className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.03]"
                        src={work.videoUrl} poster={work.posterUrl || undefined} muted loop playsInline controls />
                    ) : (
                      <div className="absolute inset-0 flex flex-col items-center justify-center bg-[radial-gradient(circle_at_50%_35%,rgba(34,211,238,0.11),transparent_38%),linear-gradient(145deg,#131722,#090b10)]">
                        <div className="w-14 h-14 rounded-full border border-white/15 bg-white/[0.06] backdrop-blur flex items-center justify-center text-white/80 transition-transform duration-300 group-hover:scale-110">
                          <svg className="w-5 h-5 ml-0.5" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
                        </div>
                        <span className="mt-4 text-[10px] uppercase tracking-[0.25em] text-slate-600">Video Coming Soon</span>
                      </div>
                    )}
                  </div>
                  <div className={`absolute inset-0 bg-gradient-to-t ${work.accent} opacity-80 transition-opacity duration-300 group-hover:opacity-100 pointer-events-none`} />
                  <div className="absolute inset-x-0 bottom-0 p-6 bg-gradient-to-t from-black/90 via-black/40 to-transparent pointer-events-none">
                    <span className="text-[10px] text-cyan-300 tracking-[0.2em] uppercase">Work 0{index + 1}</span>
                    <h3 className="text-xl font-semibold mt-2">{work.title}</h3>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
          <div className="mt-4 flex items-center justify-center gap-2 text-[11px] text-slate-500 sm:hidden" aria-label="3개의 작업 영상, 좌우로 넘겨서 확인">
            <svg aria-hidden="true" className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" /></svg>
            <span>옆으로 넘겨 작업 더 보기</span>
            <svg aria-hidden="true" className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="m13.5 4.5 7.5 7.5m0 0-7.5 7.5M21 12H3" /></svg>
            <span className="ml-1 flex items-center gap-1" aria-hidden="true">
              <span className="h-1.5 w-1.5 rounded-full bg-cyan-400" />
              <span className="h-1.5 w-1.5 rounded-full bg-white/20" />
              <span className="h-1.5 w-1.5 rounded-full bg-white/20" />
            </span>
          </div>
        </div>
      </section>

      <Divider />

      {/* 3. Lesson method and strengths */}
      <section className="py-14 sm:py-32 px-5 sm:px-6">
        <div className="max-w-5xl mx-auto">
          <SectionHeading
            eyebrow="Why MIDI LAB"
            title={<>기능을 외우는 대신,<br className="hidden sm:block" />{' '}<span className="gradient-text">음악을 완성하는 방법</span>을 배웁니다</>}
            description="목표와 현재 프로젝트를 기준으로 필요한 과정을 가장 이해하기 쉬운 순서로 연결합니다."
          />

          <div className="overflow-hidden rounded-2xl border border-white/[0.07] bg-white/[0.025] px-4 md:hidden">
            {WHY_ITEMS.map((item, index) => (
              <Reveal key={item.title} delay={index * 80}>
                <div className={`flex gap-3 py-4 ${index < WHY_ITEMS.length - 1 ? 'border-b border-white/[0.07]' : ''}`}>
                  <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-cyan-500/10 to-purple-500/10 [&>svg]:h-5 [&>svg]:w-5">
                    {item.icon}
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-sm font-semibold leading-5 text-white">{item.title}</h3>
                    <p className="mt-1 text-[11px] leading-[1.55] text-slate-400">{item.body}</p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>

          <div className="hidden md:grid md:grid-cols-3 md:gap-5">
            {WHY_ITEMS.map((item, index) => (
              <ValueCard
                key={item.title}
                delay={index * 80}
                icon={item.icon}
                title={item.title}
                body={item.body}
              />
            ))}
          </div>
        </div>
      </section>

      <Divider />

      {/* 5. Student platform */}
      <section className="py-14 sm:py-32 px-5 sm:px-6">
        <div className="max-w-5xl mx-auto">
          <SectionHeading
            eyebrow="Student Platform"
            title={<>수업이 끝나도<br className="hidden sm:block" />{' '}<span className="gradient-text">작업은 계속됩니다</span></>}
            description={<>배우고 끝나는 구조가 아니라,<br className="hidden sm:block" />{' '}연습하고 도전하고 보상받는 과정까지 설계했습니다.</>}
          />

          <div className="grid grid-cols-2 gap-2.5 [&>div]:min-w-0 sm:grid-cols-2 sm:gap-5">
            {PLATFORM_FEATURES.map((feature, index) => (
              <Reveal key={feature.title} delay={index * 80}>
                <div className="group overflow-hidden h-full bg-white/[0.03] border border-white/[0.07] md:hover:-translate-y-[3px] md:hover:bg-white/[0.045] md:hover:border-cyan-400/20 rounded-xl sm:rounded-2xl transition-[transform,background-color,border-color] duration-300">
                  <div className="reveal-media relative aspect-[16/9] overflow-hidden bg-[#10131a]">
                    {feature.imageSrc ? (
                      <img src={feature.imageSrc} alt={`${feature.title} 화면`} className="w-full h-full object-cover object-top transition-transform duration-700 group-hover:scale-[1.02]" />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center bg-[radial-gradient(circle_at_50%_25%,rgba(168,85,247,0.1),transparent_45%),linear-gradient(145deg,#121620,#0b0d12)]">
                        <div className="w-[72%] h-[62%] rounded-xl border border-white/[0.08] bg-white/[0.025] p-4 shadow-2xl">
                          <div className="w-1/3 h-2 rounded-full bg-white/10 mb-4" />
                          <div className="grid grid-cols-3 gap-2 h-[calc(100%-24px)]">
                            <div className="rounded-md bg-cyan-400/[0.07] border border-cyan-400/10" />
                            <div className="col-span-2 rounded-md bg-white/[0.035] border border-white/[0.05]" />
                          </div>
                        </div>
                        <span className="absolute bottom-4 text-[9px] uppercase tracking-[0.22em] text-slate-700">Image Placeholder</span>
                      </div>
                    )}
                    <div className={`absolute inset-0 bg-gradient-to-t ${feature.imageSrc ? 'from-[#0d0f14]/60' : 'from-[#0d0f14]'} via-transparent to-transparent pointer-events-none`} />
                  </div>
                  <div className="p-3 sm:p-7">
                    <span className="text-[9px] sm:text-[10px] text-purple-400 tracking-[0.2em]">0{index + 1}</span>
                    <h3 className="mt-1.5 sm:mt-2 mb-1.5 sm:mb-2 min-h-[2.4rem] sm:min-h-0 text-[13px] sm:text-lg font-semibold leading-[1.4] sm:leading-normal break-keep sm:break-normal">{feature.title}</h3>
                    <p className="text-slate-400 text-[11px] sm:text-sm leading-[1.55] sm:leading-6 break-words">{feature.description}</p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>

          <Reveal>
            <div className="mt-5 sm:mt-8 rounded-2xl border border-cyan-400/20 bg-gradient-to-r from-cyan-500/[0.07] via-white/[0.025] to-purple-500/[0.07] px-4 py-4 sm:px-8 sm:py-6 text-center">
              <span className="text-xs text-cyan-300 tracking-[0.16em] uppercase font-semibold">포인트 랭킹</span>
              <p className="mt-2 sm:mt-3 text-xs sm:text-base text-slate-200 leading-5 sm:leading-relaxed">
                챌린지와 배틀 등으로 획득한<br className="hidden sm:block" />{' '}
                누적 포인트를 기준으로<br className="hidden" />{' '}매달 1위에게 상금을 지급합니다.
              </p>
              <p className="mt-2 text-xs text-slate-500">(수강생 5명 이상부터 운영)</p>
            </div>
          </Reveal>

          <Reveal>
            <p className="text-center text-slate-300 text-xs sm:text-lg leading-5 sm:leading-relaxed mt-7 sm:mt-16">
              보여주기 위한 기능이 아니라,<br className="hidden sm:block" />{' '}
              <span className="text-white font-medium">수업 밖에서도 꾸준히 음악을 만들 수 있도록</span> 직접 설계했습니다.
            </p>
          </Reveal>
        </div>
      </section>

      <Divider />

      {/* 6. Instructor */}
      <section className="py-14 sm:py-32 px-5 sm:px-6">
        <div className="max-w-5xl mx-auto">
          <Reveal>
            <div className="relative overflow-hidden grid grid-cols-[128px_minmax(0,1fr)] sm:grid-cols-1 md:grid-cols-[0.8fr_1.2fr] gap-x-4 gap-y-0 sm:gap-10 md:gap-16 items-center bg-white/[0.025] border border-white/[0.07] rounded-3xl p-5 sm:p-12">
              <div className="absolute -top-40 -left-32 w-80 h-80 rounded-full bg-cyan-500/[0.05] blur-3xl pointer-events-none" />
              <div className="reveal-media relative aspect-square max-w-[128px] sm:max-w-xs w-full mx-auto overflow-hidden rounded-2xl border border-white/[0.08] bg-[radial-gradient(circle_at_50%_35%,rgba(34,211,238,0.1),transparent_42%),linear-gradient(145deg,#141821,#0b0d12)]">
                <img
                  src="/landing/profile.png"
                  alt="프로듀서 JVNE 작업 모습"
                  className="w-full h-full object-cover object-[50%_50%]"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/25 via-transparent to-transparent pointer-events-none" />
              </div>
              <div className="relative contents sm:block">
                <div className="min-w-0 self-center">
                  <span className="text-[10px] sm:text-xs text-cyan-400 tracking-[0.18em] sm:tracking-[0.22em] uppercase font-semibold">Instructor</span>
                  <p className="text-xs sm:text-sm text-slate-400 mt-1 sm:mt-4">프로듀서 · 싱어송라이터</p>
                  <p className="gradient-text inline-block text-xl sm:text-2xl font-bold mt-0.5 sm:mt-1">JVNE</p>
                </div>
                <h2 className="col-span-2 sm:col-span-1 text-[1.3rem] sm:text-4xl font-bold mt-4 sm:mt-7 mb-3 sm:mb-6 leading-snug sm:leading-tight break-keep sm:break-normal">
                  학생이 원하는 음악을<br className="hidden sm:block" />{' '}
                  가장 이해하기 쉬운 구조로 바꿉니다
                </h2>
                <div className="col-span-2 sm:col-span-1 space-y-2 sm:space-y-5 text-slate-400 text-xs sm:text-base leading-5 sm:leading-8">
                  <p>작곡과 편곡부터 기타, 피아노, 베이스, 드럼, 보컬, 녹음, 믹싱과 마스터링까지 직접 작업합니다.</p>
                  <p>학생이 만들고 싶은 결과를 먼저 파악하고, 현재 수준에 필요한 내용만 이해하기 쉬운 순서로 연결해 가르칩니다.</p>
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      <Divider />

      {/* 7. Pricing and lesson format */}
      <section className="py-14 sm:py-32 px-5 sm:px-6">
        <div className="max-w-5xl mx-auto">
          <SectionHeading
            eyebrow="Pricing"
            title={<>필요한 속도에 맞춰<br className="hidden sm:block" />{' '}<span className="gradient-text">선택할 수 있습니다</span></>}
            description={<span className="hidden md:inline">모든 수업은 학생의 프로젝트를 중심으로 진행하는 1:1 레슨입니다.</span>}
          />

          <Reveal>
            <div className="overflow-hidden rounded-2xl border border-white/[0.09] bg-white/[0.025] md:hidden">
              <div className="grid grid-cols-2 divide-x divide-white/[0.08]">
                {LESSON_PLANS.map(plan => (
                  <div key={plan.name} className={`min-w-0 p-3.5 ${plan.featured ? 'bg-cyan-400/[0.035]' : ''}`}>
                    <span className="inline-flex rounded-full border border-cyan-400/20 bg-cyan-400/[0.07] px-2 py-0.5 text-[9px] font-medium text-cyan-300">
                      첫 등록 혜택
                    </span>
                    <h3 className="mt-2 min-h-[2.5rem] text-[13px] font-semibold leading-5 text-white break-keep">{plan.name}</h3>
                    <p className="mt-2 text-[10px] text-slate-600">
                      정상가 <span className="line-through decoration-slate-600">{formatWon(plan.originalPrice)}</span>
                    </p>
                    <p className="mt-1 text-cyan-300">
                      <span className="block text-[10px] font-medium">첫 달</span>
                      <span className="whitespace-nowrap text-[1.05rem] font-bold tracking-tight">{formatWon(plan.price)}</span>
                    </p>
                    <div className="my-3 h-px bg-white/[0.07]" />
                    <div className="space-y-1 text-[11px] leading-4 text-slate-400">
                      {plan.detail.split(' · ').map(detail => <p key={detail}>{detail}</p>)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Reveal>

          <div className="hidden max-w-4xl mx-auto md:grid md:grid-cols-2 md:gap-5">
            {LESSON_PLANS.map((plan, index) => (
              <Reveal key={plan.name} delay={index * 80}>
                <div className={`relative h-full rounded-2xl p-5 sm:p-8 border md:hover:-translate-y-[3px] transition-[transform,background-color,border-color,box-shadow] duration-300 ${plan.featured ? 'bg-gradient-to-b from-cyan-500/[0.09] to-purple-500/[0.05] border-cyan-400/25 shadow-[0_0_50px_rgba(34,211,238,0.06)] md:hover:border-cyan-400/35' : 'bg-white/[0.025] border-white/[0.07] md:hover:bg-white/[0.04] md:hover:border-white/[0.14]'}`}>
                  <span className="text-xs text-cyan-300/80 tracking-[0.14em] uppercase">{plan.name}</span>
                  <span className="absolute top-4 sm:top-6 right-4 sm:right-6 rounded-full border border-cyan-400/20 bg-cyan-400/[0.07] px-3 py-1 text-[10px] font-medium text-cyan-300">
                    첫 등록 혜택
                  </span>
                  <p className="mt-5 sm:mt-6 text-sm text-slate-600 line-through decoration-slate-600">{formatWon(plan.originalPrice)}</p>
                  <p className="mt-1 mb-3 text-2xl sm:text-3xl font-bold tracking-tight text-cyan-300">첫 달 {formatWon(plan.price)}</p>
                  <p className="text-slate-400 text-sm">{plan.detail}</p>
                  <div className="h-px bg-white/[0.07] my-4 sm:my-6" />
                  <p className="text-slate-400 text-sm leading-6 sm:leading-7">{plan.description}</p>
                  <p className="mt-2 text-slate-500 text-sm leading-6 sm:leading-7">{plan.normalPriceNote}</p>
                </div>
              </Reveal>
            ))}
          </div>

          <Reveal>
            <div className="mt-4 space-y-2 rounded-xl border border-white/[0.07] bg-white/[0.02] px-4 py-3 text-xs leading-5 text-slate-500 md:hidden">
              <p>모든 수업은 학생의 프로젝트를 중심으로 진행하는 1:1 레슨입니다.</p>
              <p>다음 달부터 각 과정의 정상가가 적용됩니다.</p>
              <p>무료 테스트 레슨 후 등록 여부를 결정할 수 있습니다.</p>
            </div>
          </Reveal>

          <Reveal>
            <div className="mt-6 sm:mt-8 flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-8 text-center text-sm text-slate-400">
              <span className="inline-flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />홍대입구역 사거리 인근 대면</span>
              <span className="hidden sm:block w-px h-4 bg-white/10" />
              <span className="inline-flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-purple-400" />Discord 온라인 수업</span>
            </div>
            <div className="hidden max-w-2xl mx-auto mt-6 rounded-xl border border-white/[0.07] bg-white/[0.02] px-5 py-4 text-center text-sm text-slate-500 leading-6 md:block">
              <p>무료 테스트 레슨 후 등록 여부를 결정할 수 있습니다.</p>
              <p className="hidden sm:block mt-2 text-slate-400">첫 등록 혜택</p>
              <p className="hidden sm:block">
                월 4회 첫 달 <span className="text-cyan-300/80">{formatWon(LESSON_PLANS[0].price)}</span>
                <span className="mx-2 text-slate-700">·</span>
                월 8회 첫 달 <span className="text-cyan-300/80">{formatWon(LESSON_PLANS[1].price)}</span>
              </p>
              <p className="mt-2 sm:mt-1">다음 달부터 각 과정의 정상가가 적용됩니다.</p>
            </div>
          </Reveal>
        </div>
      </section>

      <Divider />

      {/* 8. Completion and release support */}
      <section className="pt-14 pb-10 sm:py-32 px-5 sm:px-6">
        <div className="max-w-5xl mx-auto">
          <SectionHeading
            eyebrow="Optional Production Support"
            title={<>레슨 이후,<br className="hidden sm:block" />{' '}<span className="gradient-text">곡을 세상에 내보내는 과정까지</span></>}
            description={<>
              <span className="md:hidden">완성된 곡에 필요한 제작·발매 과정을 별도 옵션으로 함께 진행할 수 있습니다.</span>
              <span className="hidden md:inline">자작곡이 완성 단계에 도달하면, 필요에 따라 별도 유료 옵션으로<br /> 보컬 녹음, 믹싱·마스터링과 음원 발매까지 함께 진행할 수 있습니다.</span>
            </>}
          />

          <Reveal>
            <div className="rounded-2xl border border-dashed border-white/[0.12] bg-white/[0.018] p-3.5 md:hidden">
              <div className="grid grid-cols-3 gap-1.5">
                {PRODUCTION_OPTIONS.map(({ title, icon: Icon }) => (
                  <div key={title} className="flex min-w-0 flex-col items-center text-center">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/[0.08] bg-gradient-to-br from-cyan-500/10 to-purple-500/10 text-purple-300">
                      <Icon size={17} strokeWidth={1.7} aria-hidden="true" />
                    </div>
                    <span className="mt-2 text-[10px] font-medium leading-4 text-slate-200 break-keep">{title}</span>
                  </div>
                ))}
              </div>
              <div className="my-3.5 h-px bg-white/[0.07]" />
              <p className="text-center text-[11px] leading-5 text-slate-500">
                곡이 완성 단계에 도달하면 필요한 작업만 별도 유료로 지원합니다.
              </p>
            </div>
          </Reveal>

          <div className="hidden md:grid md:grid-cols-3 md:gap-5">
            {PRODUCTION_OPTIONS.map((option, index) => (
              <Reveal key={option.title} delay={index * 80}>
                <div className="h-full rounded-2xl border border-dashed border-white/[0.12] bg-white/[0.018] p-5 sm:p-7 md:hover:-translate-y-[3px] md:hover:bg-white/[0.03] md:hover:border-purple-400/20 transition-[transform,background-color,border-color] duration-300">
                  <span className="text-[9px] text-slate-600 tracking-[0.18em]">별도 유료 지원</span>
                  <h3 className="text-lg font-semibold mt-3 sm:mt-4 mb-4 sm:mb-5">{option.title}</h3>
                  <div className="space-y-2 min-h-0 md:min-h-[68px]">
                    {option.lines.map(line => <p key={line} className="text-slate-400 text-sm leading-6">{line}</p>)}
                  </div>
                </div>
              </Reveal>
            ))}
          </div>

          <Reveal>
            <p className="hidden md:block mt-8 text-center text-sm text-slate-600">
              곡의 상태와 필요한 작업 범위에 따라 비용과 진행 방식이 달라집니다.
            </p>
          </Reveal>
        </div>
      </section>

      {/* 9. Final CTA */}
      <section className="py-16 sm:py-40 px-5 sm:px-6 relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[min(800px,110vw)] h-[420px] rounded-full"
            style={{ background: 'radial-gradient(ellipse, rgba(34,211,238,0.06) 0%, rgba(168,85,247,0.025) 40%, transparent 70%)' }} />
        </div>

        <div className="max-w-3xl mx-auto text-center relative z-10">
          <Reveal>
            <span className="text-xs text-slate-500 tracking-[0.22em] uppercase font-semibold">Free Test Lesson</span>
            <h2 className="text-3xl sm:text-5xl md:text-6xl font-bold mt-5 sm:mt-6 mb-6 sm:mb-8 leading-tight tracking-tight">
              백 번의 설명보다<br className="hidden sm:block" />{' '}
              <span className="gradient-text">한 번의 경험</span>이 확실합니다
            </h2>
            <p className="text-slate-400 text-sm sm:text-xl mb-8 sm:mb-12 leading-6 sm:leading-relaxed">
              무료 테스트 레슨으로 수업 방식과 진행 방향을 직접 확인해보세요.<br />
              수업 후 정규 등록 여부를 결정하시면 됩니다.
            </p>
            <button ref={finalCtaRef} onClick={() => setShowForm(true)}
              className="cta-btn inline-flex w-full max-w-[300px] sm:w-auto sm:max-w-none items-center justify-center gap-3 px-6 sm:px-10 py-4 sm:py-5 rounded-2xl text-white font-bold text-base sm:text-lg shadow-[0_0_40px_rgba(34,211,238,0.2)] hover:shadow-[0_0_60px_rgba(34,211,238,0.35)] transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]">
              무료 테스트 레슨 신청하기
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" /></svg>
            </button>
          </Reveal>
        </div>
      </section>

      <footer className="border-t border-white/[0.05] py-6 px-6">
        <div className="max-w-5xl mx-auto flex flex-col items-center justify-center gap-1">
          <Logo theme="dark" size="sm" />
          <p className="text-slate-600 text-xs text-center">© {new Date().getFullYear()} MIDI LAB. All rights reserved.</p>
        </div>
      </footer>

      <div
        aria-hidden={!showMobileStickyCta}
        className={`fixed inset-x-0 bottom-0 z-40 border-t border-white/[0.08] bg-[#0A0A0A]/90 px-4 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] backdrop-blur-xl transition-[opacity,transform] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] sm:hidden ${showMobileStickyCta ? 'translate-y-0 opacity-100 pointer-events-auto' : 'translate-y-3 opacity-0 pointer-events-none'}`}
      >
        <button
          onClick={() => setShowForm(true)}
          tabIndex={showMobileStickyCta ? 0 : -1}
          className="cta-btn flex min-h-12 w-full items-center justify-center rounded-xl px-5 py-3 text-sm font-bold text-white shadow-[0_0_28px_rgba(34,211,238,0.22)] active:scale-[0.98]"
        >
          무료 테스트 레슨 신청하기
        </button>
      </div>

      {showLogin && <LoginModal onClose={() => setShowLogin(false)} />}
      {showForm && <ApplicationForm onClose={() => setShowForm(false)} />}
    </div>
  );
}
