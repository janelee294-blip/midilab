import React, { useState, useEffect } from 'react';
import { Eye, EyeOff, Lock, AlertCircle, CheckCircle, ArrowRight, Phone } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import type { Product } from '../lib/supabase';
import { Logo } from '../components/shared/Logo';
import { sendDiscordNotification, DISCORD_COLORS } from '../lib/discord';


export function LandingPage() {
  const { signIn } = useAuth();

  // Login state
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState('');

  // Application modal state
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [formError, setFormError] = useState('');

  // Form fields
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
    supabase.from('products').select('*').eq('is_active', true).eq('expose_on_signup', true).order('sort_order').order('created_at')
      .then(({ data }) => setProducts(data || []));
  }, []);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoginError('');
    setLoginLoading(true);
    const { error } = await signIn(phone, password);
    if (error) setLoginError(error);
    setLoginLoading(false);
  }

  async function handleApplicationSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError('');
    setSubmitting(true);
    const finalGoal = appGoals.map(g => g === '기타' ? `기타: ${appGoalOther}` : g).join(', ');
    try {
      const { error: dbError } = await supabase.from('lesson_applications').insert({
        full_name: appName,
        phone: appPhone,
        age: appAge,
        experience: `[성별: ${appGender}] ${appExperience}`,
        goals: finalGoal,
        preferred_schedule: appLessonType,
        questions: `[장르/레퍼런스] ${appGenre}\n[추천인] ${appReferrer}\n[전달할 말] ${appExtra}`,
        status: 'waiting',
        product_id: appProductId || null,
      });
      if (dbError) throw dbError;
      await sendDiscordNotification(
        '신규 레슨 신청',
        `**이름:** ${appName}\n**연락처:** ${appPhone}\n**수업방식:** ${appLessonType}\n**목적:** ${finalGoal}`,
        DISCORD_COLORS.INFO
      );
      setSubmitted(true);
    } catch (err: any) {
      setFormError(err.message || '신청 중 오류가 발생했습니다.');
    } finally {
      setSubmitting(false);
    }
  }

  // 40 stars: [top%, left%, size(px), duration(s), delay(s)]
  const stars: [string, string, number, number, number][] = [
    ['3%','7%',1,5.2,0],['5%','31%',1.5,6.8,1.1],['8%','58%',1,4.9,0.4],['6%','82%',1.5,7.1,2.0],
    ['12%','19%',1,6.3,0.7],['15%','44%',2,5.6,1.8],['11%','71%',1,7.4,0.3],['14%','93%',1.5,5.1,2.5],
    ['22%','4%',1,6.7,1.4],['19%','88%',1,5.8,0.9],['28%','13%',1.5,7.2,2.2],['25%','67%',1,6.1,0.6],
    ['33%','38%',1,5.5,1.7],['30%','79%',1.5,6.9,0.2],['38%','6%',1,7.0,2.8],['35%','51%',2,5.3,1.3],
    ['42%','86%',1,6.4,0.5],['44%','25%',1.5,5.9,2.1],['48%','73%',1,7.3,1.0],['50%','97%',1,6.0,1.6],
    ['55%','11%',1.5,5.7,2.4],['52%','42%',1,6.6,0.8],['58%','64%',2,5.4,1.9],['56%','89%',1,7.1,0.1],
    ['63%','19%',1,6.2,2.7],['60%','54%',1.5,5.0,1.2],['67%','76%',1,6.8,0.6],['65%','34%',1,7.5,2.3],
    ['72%','8%',1.5,5.3,1.5],['70%','47%',1,6.5,0.3],['75%','83%',2,5.8,2.0],['73%','61%',1,7.2,0.9],
    ['80%','22%',1,6.3,1.8],['78%','71%',1.5,5.1,2.6],['84%','39%',1,6.9,0.4],['82%','91%',1,5.6,1.1],
    ['88%','14%',1.5,7.0,2.4],['86%','56%',1,5.4,0.7],['92%','78%',1,6.7,1.3],['90%','30%',1.5,5.9,0.0],
  ];

  return (
    <div className="min-h-screen bg-[#020617] flex items-center justify-center p-4 relative overflow-hidden">
      <style>{`
        @keyframes lp-twinkle {
          0%,100% { opacity: 0.08; }
          50%      { opacity: 0.75; }
        }
        @keyframes lp-glow-pulse {
          0%,100% { filter: drop-shadow(0 0 6px rgba(34,211,238,0.35)); }
          50%      { filter: drop-shadow(0 0 14px rgba(34,211,238,0.65)); }
        }
      `}</style>

      {/* Nebula — cyan top-left */}
      <div className="absolute pointer-events-none"
        style={{ top: '-20%', left: '-15%', width: '55%', height: '55%', borderRadius: '50%',
          background: 'radial-gradient(ellipse, rgba(34,211,238,0.09) 0%, transparent 68%)' }} />
      {/* Nebula — purple bottom-right */}
      <div className="absolute pointer-events-none"
        style={{ bottom: '-25%', right: '-12%', width: '52%', height: '52%', borderRadius: '50%',
          background: 'radial-gradient(ellipse, rgba(168,85,247,0.08) 0%, transparent 68%)' }} />

      {/* Stars */}
      {stars.map(([top, left, sz, dur, del], i) => (
        <div key={i} className="absolute rounded-full bg-white pointer-events-none"
          style={{ top, left, width: sz, height: sz,
            animation: `lp-twinkle ${dur}s ease-in-out infinite`,
            animationDelay: `${del}s` }} />
      ))}

      {/* Edge DNA — top-right corner, barely visible */}
      <svg className="absolute top-0 right-0 pointer-events-none" width="120" height="280"
        style={{ opacity: 0.028 }} viewBox="0 0 120 280" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M30 0 Q70 50 30 100 Q-10 150 30 200 Q70 250 30 280"
          stroke="#22d3ee" strokeWidth="1.2" fill="none" />
        <path d="M65 0 Q25 50 65 100 Q105 150 65 200 Q25 250 65 280"
          stroke="#a855f7" strokeWidth="1.2" fill="none" />
        {[50,100,150,200,250].map(y => (
          <line key={y} x1="30" y1={y} x2="65" y2={y} stroke="#22d3ee" strokeWidth="0.7" opacity="0.5" />
        ))}
      </svg>

      {/* Edge synapse — bottom-left corner, barely visible */}
      <svg className="absolute bottom-0 left-0 pointer-events-none" width="110" height="130"
        style={{ opacity: 0.025 }} viewBox="0 0 110 130" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="30" cy="40"  r="5" fill="#a855f7" />
        <circle cx="75" cy="20"  r="3" fill="#22d3ee" />
        <circle cx="90" cy="60"  r="4" fill="#a855f7" />
        <circle cx="50" cy="80"  r="3" fill="#22d3ee" />
        <circle cx="20" cy="100" r="4" fill="#a855f7" />
        <line x1="30" y1="40" x2="75" y2="20"  stroke="#22d3ee" strokeWidth="0.7" />
        <line x1="75" y1="20" x2="90" y2="60"  stroke="#a855f7" strokeWidth="0.7" />
        <line x1="90" y1="60" x2="50" y2="80"  stroke="#22d3ee" strokeWidth="0.7" />
        <line x1="50" y1="80" x2="20" y2="100" stroke="#a855f7" strokeWidth="0.7" />
      </svg>

      {/* ── Main card area ── */}
      <div className="w-full max-w-sm relative z-10">

        {/* Logo */}
        <div className="flex items-center justify-center mb-7">
          <Logo theme="dark" size="md" />
        </div>

        {/* Login Card */}
        <div className="bg-white/[0.03] backdrop-blur-xl border border-white/[0.08] rounded-2xl p-7
          hover:border-white/[0.13] transition-colors duration-300">

          {loginError && (
            <div className="mb-4 flex items-center gap-2 bg-red-500/10 border border-red-500/20 text-red-300 rounded-xl px-4 py-3 text-sm">
              <AlertCircle size={14} />
              {loginError}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="text-[11px] font-medium text-slate-500 uppercase tracking-wider block mb-1.5">
                전화번호
              </label>
              <div className="relative">
                <Phone size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-600" />
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="010-0000-0000"
                  className="w-full pl-10 pr-4 py-2.5 bg-white/[0.04] border border-white/[0.08] rounded-xl text-white text-sm placeholder-slate-700
                    focus:outline-none focus:border-cyan-500/50 focus:bg-white/[0.06] transition-all duration-200"
                />
              </div>
            </div>

            <div>
              <label className="text-[11px] font-medium text-slate-500 uppercase tracking-wider block mb-1.5">
                비밀번호
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full px-4 py-2.5 pr-11 bg-white/[0.04] border border-white/[0.08] rounded-xl text-white text-sm placeholder-slate-700
                    focus:outline-none focus:border-cyan-500/50 focus:bg-white/[0.06] transition-all duration-200"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-600 hover:text-slate-400 transition-colors"
                >
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loginLoading}
              className="w-full py-2.5 rounded-xl text-sm font-semibold text-white
                bg-gradient-to-r from-cyan-500 to-purple-600
                hover:opacity-90 disabled:opacity-40
                transition-opacity duration-200
                flex items-center justify-center gap-2
                shadow-[0_1px_24px_rgba(34,211,238,0.18)]"
            >
              {loginLoading ? (
                <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              ) : <Lock size={14} />}
              {loginLoading ? '로그인 중...' : '로그인'}
            </button>
          </form>

          <div className="mt-4 pt-4 border-t border-white/[0.05]">
            <button
              onClick={() => setShowForm(true)}
              className="w-full py-2.5 rounded-xl text-sm font-medium text-slate-400 hover:text-white
                border border-white/[0.07] hover:border-white/[0.16]
                transition-all duration-200 flex items-center justify-center gap-2"
            >
              레슨 신청하기
              <ArrowRight size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* Application Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => !submitting && setShowForm(false)} />
          <div className="relative w-full max-w-xl bg-slate-900 border border-white/10 rounded-3xl shadow-2xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-7 py-5 border-b border-white/10">
              <div>
                <h2 className="text-lg font-bold text-white">레슨 신청서</h2>
                {!submitted && <p className="text-slate-400 text-xs mt-0.5">모든 내용을 성실히 작성해주세요</p>}
              </div>
              {!submitting && (
                <button onClick={() => setShowForm(false)} className="text-slate-500 hover:text-white transition-colors p-1">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>

            <div className="overflow-y-auto flex-1 px-7 py-5">
              {submitted ? (
                <div className="text-center py-10">
                  <CheckCircle size={52} className="text-emerald-400 mx-auto mb-4" />
                  <h3 className="text-lg font-bold text-white mb-2">신청이 완료되었습니다!</h3>
                  <p className="text-slate-400 text-sm">
                    관리자 확인 후 안내드리겠습니다.<br />
                    승인 완료 시 로그인하여 이용하실 수 있습니다.
                  </p>
                  <button
                    onClick={() => { setShowForm(false); setSubmitted(false); setAppName(''); setAppPhone(''); setAppAge(''); setAppGender(''); setAppLessonType(''); setAppExperience(''); setAppGoals([]); setAppGoalOther(''); setAppGenre(''); setAppExtra(''); setPolicyAgreed(false); }}
                    className="mt-6 px-6 py-2.5 bg-amber-400 hover:bg-amber-300 text-slate-900 font-semibold rounded-xl transition-all text-sm"
                  >
                    닫기
                  </button>
                </div>
              ) : (
                <form onSubmit={handleApplicationSubmit} className="space-y-5">
                  {formError && (
                    <div className="bg-red-500/10 border border-red-500/20 text-red-300 rounded-xl px-4 py-3 text-sm">
                      {formError}
                    </div>
                  )}

                  <div>
                    <label className="text-xs font-medium text-slate-400 block mb-1.5">수강 희망 상품 <span className="text-amber-400">*</span></label>
                    <select
                      required
                      value={appProductId}
                      onChange={e => setAppProductId(e.target.value)}
                      className="w-full px-4 py-3 bg-slate-800 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-amber-400/40 transition-all"
                    >
                      <option value="" disabled className="bg-slate-800 text-slate-400">상품을 선택해주세요</option>
                      {products.map(p => (
                        <option key={p.id} value={p.id} className="bg-slate-800 text-white">
                          {p.name} — {p.total_price.toLocaleString()}원 / {p.tickets}회
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-medium text-slate-400 block mb-1.5">이름 <span className="text-amber-400">*</span></label>
                    <input type="text" value={appName} onChange={e => setAppName(e.target.value)} required placeholder="홍길동"
                      className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-amber-400/40 transition-all text-sm" />
                  </div>

                  <div>
                    <label className="text-xs font-medium text-slate-400 block mb-1.5">연락처 <span className="text-amber-400">*</span></label>
                    <input type="tel" value={appPhone} onChange={e => setAppPhone(e.target.value)} required placeholder="010-0000-0000"
                      className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-amber-400/40 transition-all text-sm" />
                  </div>

                  <div>
                    <label className="text-xs font-medium text-slate-400 block mb-1.5">나이 <span className="text-amber-400">*</span></label>
                    <input type="text" value={appAge} onChange={e => setAppAge(e.target.value)} required placeholder="예: 25"
                      className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-amber-400/40 transition-all text-sm" />
                  </div>

                  <div>
                    <label className="text-xs font-medium text-slate-400 block mb-2">성별 <span className="text-amber-400">*</span></label>
                    <div className="flex gap-3">
                      {['남성', '여성'].map(g => (
                        <button key={g} type="button" onClick={() => setAppGender(g)}
                          className={`flex-1 py-2.5 rounded-xl border text-sm font-medium transition-all ${appGender === g ? 'bg-amber-400/20 border-amber-400/50 text-amber-300' : 'bg-white/5 border-white/10 text-slate-400 hover:border-white/20'}`}>
                          {g}
                        </button>
                      ))}
                    </div>
                    <input type="hidden" required value={appGender} onChange={() => {}} />
                  </div>

                  <div>
                    <label className="text-xs font-medium text-slate-400 block mb-2">희망 수업 방식 <span className="text-amber-400">*</span></label>
                    <div className="flex gap-2">
                      {['대면', '비대면', '혼합'].map(t => (
                        <button key={t} type="button" onClick={() => setAppLessonType(t)}
                          className={`flex-1 py-2.5 rounded-xl border text-sm font-medium transition-all ${appLessonType === t ? 'bg-amber-400/20 border-amber-400/50 text-amber-300' : 'bg-white/5 border-white/10 text-slate-400 hover:border-white/20'}`}>
                          {t}
                        </button>
                      ))}
                    </div>
                    <input type="hidden" required value={appLessonType} onChange={() => {}} />
                  </div>

                  <div>
                    <label className="text-xs font-medium text-slate-400 block mb-1.5">음악 배경 및 경험 <span className="text-amber-400">*</span></label>
                    <p className="text-xs text-slate-600 mb-2"></p>
                    <textarea value={appExperience} onChange={e => setAppExperience(e.target.value)} required rows={4} placeholder="음악 공부 경험, 사용해 본 시퀀서와 숙련도, 다룰 수 있는 악기나 컴퓨터 사양(Mac/Windows 등), 보유 중인 음악 장비 등 편하게 적어주세요."
                      className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-amber-400/40 transition-all text-sm resize-none" />
                  </div>

                  <div>
                    <label className="text-xs font-medium text-slate-400 block mb-2">레슨 목적 <span className="text-amber-400">*</span></label>
                    <div className="space-y-2">
                      {[
                        '취미로 내 음악 한 곡 만들기',
                        '작곡·편곡 기초 다지기',
                        '보컬·악기 녹음 및 믹싱',
                        'K-POP 데모 제작 및 프로 작곡가 준비',
                        '기타',
                      ].map(opt => {
                        const checked = appGoals.includes(opt);
                        const toggle = () => setAppGoals(prev => checked ? prev.filter(g => g !== opt) : [...prev, opt]);
                        return (
                          <label key={opt} className="flex items-center gap-3 cursor-pointer group">
                            <div onClick={toggle}
                              className={`w-4 h-4 rounded border-2 flex-shrink-0 flex items-center justify-center transition-all ${checked ? 'bg-amber-400 border-amber-400' : 'border-white/20 group-hover:border-white/40'}`}>
                              {checked && <svg className="w-2.5 h-2.5 text-slate-900" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
                            </div>
                            <span className={`text-sm transition-colors ${checked ? 'text-white' : 'text-slate-400'}`}>{opt}</span>
                            {opt === '기타' && checked && (
                              <input type="text" value={appGoalOther} onChange={e => setAppGoalOther(e.target.value)} required
                                placeholder="직접 입력" autoFocus
                                className="flex-1 px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-amber-400/40 text-sm" />
                            )}
                          </label>
                        );
                      })}
                    </div>
                    <input type="hidden" required value={appGoals.join(',')} onChange={() => {}} />
                  </div>

                  <div>
                    <label className="text-xs font-medium text-slate-400 block mb-1.5">좋아하는 장르 / 레퍼런스 곡 <span className="text-amber-400">*</span></label>
                    <textarea value={appGenre} onChange={e => setAppGenre(e.target.value)} required rows={2} placeholder="예: K-POP, 팝, EDM / 좋아하는 곡이나 아티스트"
                      className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-amber-400/40 transition-all text-sm resize-none" />
                  </div>

                  <div>
                    <label className="text-xs font-medium text-slate-400 block mb-1.5">추천인 이름 <span className="text-slate-600">(선택)</span></label>
                    <input type="text" value={appReferrer} onChange={e => setAppReferrer(e.target.value)}
                      placeholder="추천인의 이름을 적어주시면 두 분 모두에게 이벤트 혜택이 적용됩니다."
                      className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-amber-400/40 transition-all text-sm" />
                  </div>

                  <div>
                    <label className="text-xs font-medium text-slate-400 block mb-1.5">전달하고 싶은 말 <span className="text-slate-600">(선택)</span></label>
                    <textarea value={appExtra} onChange={e => setAppExtra(e.target.value)} rows={3} placeholder="궁금한 점이나 전하고 싶은 내용을 자유롭게 적어주세요"
                      className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-amber-400/40 transition-all text-sm resize-none" />
                  </div>

                  <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-4 space-y-3">
                    <p className="text-xs font-semibold text-slate-300">레슨 정책</p>
                    <ol className="space-y-2 text-xs text-slate-500 list-decimal list-inside leading-relaxed">
                      <li><span className="text-slate-400 font-medium">(수업 기한 및 환불)</span> 레슨 티켓의 기본 사용기간은 30일입니다. 개인수업 특성상 전체 수업의 절반 이상을 진행한 이후에는 중도 환불이 어렵습니다. 부득이한 사정으로 기한 내 티켓을 다 못 쓰실 때는 사이트 내에서 연장 신청이 가능합니다.</li>
                      <li><span className="text-slate-400 font-medium">(예약 변경)</span> 원활한 스케줄 관리를 위해 예약 변경은 수업 3일 전까지 부탁드립니다.</li>
                      <li><span className="text-slate-400 font-medium">(당일 취소 및 노쇼)</span> 당일 취소나 무단 노쇼 시에는 레슨 티켓 1장이 자동 차감됩니다.</li>
                    </ol>
                    <label className="flex items-start gap-3 cursor-pointer mt-1">
                      <div className="relative flex-shrink-0">
                        <input
                          type="checkbox"
                          required
                          checked={policyAgreed}
                          onChange={e => setPolicyAgreed(e.target.checked)}
                          className="opacity-0 absolute inset-0 w-4 h-4 cursor-pointer"
                        />
                        <div className={`w-4 h-4 mt-0.5 rounded border-2 flex items-center justify-center transition-all pointer-events-none ${policyAgreed ? 'bg-amber-400 border-amber-400' : 'border-white/20'}`}>
                          {policyAgreed && <svg className="w-2.5 h-2.5 text-slate-900" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
                        </div>
                      </div>
                      <span className="text-xs text-slate-400">위 레슨 정책을 확인했으며, 이에 동의합니다.</span>
                    </label>
                  </div>

                  <button type="submit" disabled={submitting}
                    className="w-full py-3.5 bg-amber-400 hover:bg-amber-300 disabled:opacity-50 text-slate-900 font-bold rounded-xl transition-all text-sm flex items-center justify-center gap-2">
                    {submitting ? (
                      <>
                        <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        제출 중...
                      </>
                    ) : '신청서 제출하기'}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
