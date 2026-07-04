import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Eye, EyeOff, Phone, AlertCircle, CheckCircle, Lock, X, ChevronDown } from 'lucide-react';
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
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setVisible(true); obs.disconnect(); } }, { threshold: 0.12 });
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
    <div ref={ref} style={{ transitionDelay: `${delay}ms` }}
      className={`transition-all duration-700 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
      {children}
    </div>
  );
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
                  {products.map(p => (
                    <option key={p.id} value={p.id} className="bg-slate-900 text-white">
                      {p.name} — {p.total_price.toLocaleString()}원 / {p.tickets}회
                    </option>
                  ))}
                </select>
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

// ── Value card ────────────────────────────────────────────────────────
function ValueCard({ icon, title, body, delay }: { icon: React.ReactNode; title: string; body: string; delay: number }) {
  return (
    <Reveal delay={delay}>
      <div className="group relative bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.07] hover:border-cyan-400/25 rounded-2xl p-8 transition-all duration-300 backdrop-blur-sm">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500/15 to-purple-500/15 border border-white/[0.08] flex items-center justify-center mb-5 group-hover:from-cyan-500/25 group-hover:to-purple-500/25 transition-all duration-300">
          {icon}
        </div>
        <h3 className="text-white font-semibold text-lg mb-3 leading-tight">{title}</h3>
        <p className="text-slate-400 text-sm leading-relaxed">{body}</p>
      </div>
    </Reveal>
  );
}

// ── Reward card ──────────────────────────────────────────────────────
function RewardCard({ gradient, tag, title, body, delay }: { gradient: string; tag: string; title: string; body: string; delay: number }) {
  return (
    <Reveal delay={delay}>
      <div className="relative overflow-hidden bg-white/[0.03] border border-white/[0.07] rounded-2xl p-8 backdrop-blur-sm hover:border-white/[0.12] transition-all duration-300">
        <div className={`absolute inset-0 opacity-[0.04] ${gradient}`} />
        <span className="relative text-[10px] font-bold tracking-widest uppercase text-slate-500 mb-4 block">{tag}</span>
        <h3 className="relative text-white font-bold text-xl mb-3 leading-tight">{title}</h3>
        <p className="relative text-slate-400 text-sm leading-relaxed">{body}</p>
      </div>
    </Reveal>
  );
}

// ── Main component ───────────────────────────────────────────────────
export function PremiumLanding() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useParticleCanvas(canvasRef);

  const [showLogin, setShowLogin] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white overflow-x-hidden">
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
      `}</style>

      {/* ── Fixed Header ── */}
      <header className={`fixed top-0 left-0 right-0 z-40 transition-all duration-300 ${scrolled ? 'bg-[#0A0A0A]/90 backdrop-blur-xl border-b border-white/[0.06]' : ''}`}>
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Logo theme="dark" size="md" />
          <button onClick={() => setShowLogin(true)}
            className="text-sm text-slate-400 hover:text-white border border-white/10 hover:border-white/25 px-4 py-1.5 rounded-full transition-all duration-200">
            기존 수강생 로그인
          </button>
        </div>
      </header>

      {/* ── Hero Section ── */}
      <section className="relative min-h-[100dvh] flex flex-col items-center justify-center px-6 pt-16 pb-16">
        {/* Canvas background */}
        <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" style={{ pointerEvents: 'none' }} />

        {/* Radial glows */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] rounded-full"
            style={{ background: 'radial-gradient(ellipse, rgba(34,211,238,0.06) 0%, transparent 70%)' }} />
          <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[300px] rounded-full"
            style={{ background: 'radial-gradient(ellipse, rgba(168,85,247,0.05) 0%, transparent 70%)' }} />
        </div>

        <div className="relative z-10 text-center max-w-4xl mx-auto">
          <div className="inline-flex items-center gap-2 text-xs text-slate-500 border border-white/[0.08] bg-white/[0.03] backdrop-blur-sm rounded-full px-4 py-1.5 mb-7 sm:mb-10 tracking-widest uppercase">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
            MIDI LAB · 1:1 프리미엄 음악 레슨
          </div>

          <h1 className="text-4xl sm:text-6xl md:text-7xl font-bold leading-[1.1] tracking-tight mb-6 sm:mb-8">
            음악은 기계적으로<br />
            배우는 것이 아니라,<br />
            <span className="gradient-text">가지고 노는 것</span>이다.
          </h1>

          <p className="text-slate-400 text-base sm:text-xl max-w-xl mx-auto mb-10 sm:mb-12 leading-relaxed">
            당신의 레퍼런스 곡 한 장이 교재입니다.<br />
            MIDI LAB의 1:1 밀착 레슨으로 지금 바로 시작하세요.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button onClick={() => setShowForm(true)}
              className="cta-btn px-8 py-4 rounded-2xl text-white font-bold text-base shadow-[0_0_32px_rgba(34,211,238,0.25)] hover:shadow-[0_0_48px_rgba(34,211,238,0.35)] transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]">
              첫 테스트 레슨 신청하기
            </button>
           
          </div>
        </div>

{/* Scroll indicator (수정됨) */}
<div className="absolute bottom-10 inset-x-0 flex justify-center pointer-events-none">
  <div className="flex flex-col items-center gap-2 text-slate-600 animate-bounce pointer-events-auto">
    <span className="text-xs tracking-widest uppercase">Scroll</span>
    <ChevronDown size={16} />
  </div>
</div>
      </section>

      {/* ── Value Section ── */}
      <section className="py-36 px-6">
        <div className="max-w-5xl mx-auto">
          <Reveal>
            <div className="text-center mb-20">
              <span className="text-xs text-cyan-400 tracking-widest uppercase font-semibold">Why MIDI LAB</span>
              <h2 className="text-4xl sm:text-5xl font-bold mt-4 mb-5 leading-tight">
                획일화된 교재가 아닌,<br /><span className="gradient-text">당신의 음악</span>으로 배웁니다
              </h2>
              <p className="text-slate-400 text-lg max-w-lg mx-auto leading-relaxed">
                이미 들어온 음악이 있다면, 그게 바로 첫 번째 수업 자료입니다.
              </p>
            </div>
          </Reveal>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <ValueCard
              delay={0}
              icon={<svg className="w-6 h-6 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.966 8.966 0 00-6 2.292m0-14.25v14.25" /></svg>}
              title="교재 없는 커리큘럼"
              body="좋아하는 곡 한 소절부터 시작합니다. 듣고, 뜯고, 만들어보는 과정에서 이론은 자연스럽게 따라옵니다."
            />
            <ValueCard
              delay={100}
              icon={<svg className="w-6 h-6 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M17.982 18.725A7.488 7.488 0 0012 15.75a7.488 7.488 0 00-5.982 2.975m11.963 0a9 9 0 10-11.963 0m11.963 0A8.966 8.966 0 0112 21a8.966 8.966 0 01-5.982-2.275M15 9.75a3 3 0 11-6 0 3 3 0 016 0z" /></svg>}
              title="1:1 밀착 지도"
              body="다음 회차 레슨 전에 스스로 만들어 오는 과제가 주어집니다. 막히는 부분은 메시지로 언제든 물어볼 수 있습니다."
            />
            <ValueCard
              delay={200}
              icon={<svg className="w-6 h-6 text-cyan-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9.348 14.651a3.75 3.75 0 010-5.303m5.304 0a3.75 3.75 0 010 5.303m-7.425 2.122a6.75 6.75 0 010-9.546m9.546 0a6.75 6.75 0 010 9.546M5.106 18.894c-3.808-3.808-3.808-9.98 0-13.789m13.788 0c3.808 3.808 3.808 9.981 0 13.789M12 12h.008v.008H12V12z" /></svg>}
              title="실전 중심 제작"
              body="이론보다 먼저 소리를 만들어봅니다. 첫 레슨부터 완성된 루프를 내보내는 경험을 설계합니다."
            />
          </div>
        </div>
      </section>

      {/* ── Divider ── */}
      <div className="max-w-5xl mx-auto px-6">
        <div className="h-px bg-gradient-to-r from-transparent via-white/[0.07] to-transparent" />
      </div>

      {/* ── System & Rewards Section ── */}
      <section className="py-36 px-6">
        <div className="max-w-5xl mx-auto">
          <Reveal>
            <div className="text-center mb-20">
              <span className="text-xs text-purple-400 tracking-widest uppercase font-semibold">System &amp; Rewards</span>
              <h2 className="text-4xl sm:text-5xl font-bold mt-4 mb-5 leading-tight">
                과제를 달성하면<br /><span className="gradient-text">돌아옵니다</span>
              </h2>
              <p className="text-slate-400 text-lg max-w-lg mx-auto leading-relaxed">
                연습은 의무가 아니라 보상으로 설계되어 있습니다.
              </p>
            </div>
          </Reveal>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <RewardCard
              delay={0}
              gradient="bg-gradient-to-br from-cyan-500 to-blue-600"
              tag="페이백 시스템"
              title="과제 달성 시 할인 적립"
              body="레슨 후 주어지는 과제를 완성하면 다음 결제 시 할인 포인트가 쌓입니다. 꾸준히 하면 레슨비가 줄어듭니다."
            />
            <RewardCard
              delay={100}
              gradient="bg-gradient-to-br from-purple-500 to-pink-600"
              tag="리그 랭킹"
              title="월별 상위 수강생 보상"
              body="매월 포인트 상위 수강생에게 추가 할인 및 특별 혜택이 주어집니다. 경쟁이 아닌, 동기부여를 위한 리그입니다."
            />
            <RewardCard
              delay={200}
              gradient="bg-gradient-to-br from-amber-500 to-orange-600"
              tag="티켓 제도"
              title="내 스케줄에 맞는 예약"
              body="횟수제 티켓으로 운영됩니다. 사이트에서 원하는 날짜와 시간에 직접 예약하고, 취소는 3일 전까지 가능합니다."
            />
          </div>
        </div>
      </section>

      {/* ── Divider ── */}
      <div className="max-w-5xl mx-auto px-6">
        <div className="h-px bg-gradient-to-r from-transparent via-white/[0.07] to-transparent" />
      </div>

      {/* ── Final CTA Section ── */}
      <section className="py-40 px-6 relative overflow-hidden">
        {/* Background glow */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] rounded-full"
            style={{ background: 'radial-gradient(ellipse, rgba(34,211,238,0.04) 0%, transparent 70%)' }} />
        </div>

        <div className="max-w-3xl mx-auto text-center relative z-10">
          <Reveal>
            <span className="text-xs text-slate-500 tracking-widest uppercase font-semibold">Get Started</span>
            <h2 className="text-4xl sm:text-5xl md:text-6xl font-bold mt-6 mb-8 leading-tight">
              백 번의 설명보다<br />
              <span className="gradient-text">한 번의 경험</span>이 확실합니다
            </h2>
            <p className="text-slate-400 text-xl mb-14 leading-relaxed">
              무료 테스트 레슨으로 직접 느껴보세요.<br />
              부담 없이 신청하고, 첫 레슨에서 판단하시면 됩니다.
            </p>
            <button onClick={() => setShowForm(true)}
              className="cta-btn inline-flex items-center gap-3 px-10 py-5 rounded-2xl text-white font-bold text-lg shadow-[0_0_40px_rgba(34,211,238,0.2)] hover:shadow-[0_0_60px_rgba(34,211,238,0.35)] transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]">
              지금 바로 신청하기
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" /></svg>
            </button>
          </Reveal>
        </div>
      </section>

{/* ── Footer ── */}
<footer className="border-t border-white/[0.05] py-6 px-6"> {/* 전체 상하 패딩 축소 */}
  <div className="max-w-5xl mx-auto flex flex-col items-center justify-center gap-1"> {/* 요소 간격 축소 */}
    <Logo theme="dark" size="sm" />
    <p className="text-slate-600 text-xs text-center">© 2025 MIDI LAB. All rights reserved.</p>
  </div>
</footer>

      {/* ── Overlays ── */}
      {showLogin && <LoginModal onClose={() => setShowLogin(false)} />}
      {showForm && <ApplicationForm onClose={() => setShowForm(false)} />}
    </div>
  );
}
