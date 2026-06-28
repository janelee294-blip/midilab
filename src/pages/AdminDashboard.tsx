import React, { useState, useEffect, useCallback } from 'react';
import {
  Music, Users, Calendar, Star, Clock, Calculator, Settings, Package,
  LogOut, Shield, ShoppingBag, Music2, BarChart2, Menu, X, ClipboardList,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { StudentManager } from '../components/admin/StudentManager';
import { PointsControl } from '../components/admin/PointsControl';
import { TimeSlotEditor } from '../components/admin/TimeSlotEditor';
import { ExtensionManager } from '../components/admin/ExtensionManager';
import { RefundCalculator } from '../components/admin/RefundCalculator';
import { AdminSettings } from '../components/admin/AdminSettings';
import { ProductManager } from '../components/admin/ProductManager';
import { RegistrationManager } from '../components/admin/RegistrationManager';
import { ProjectStudio } from '../components/admin/ProjectStudio';
import { InsightsDashboard } from '../components/admin/InsightsDashboard';
import { TaskManager } from '../components/admin/TaskManager';
import { Logo } from '../components/shared/Logo';

type AdminTab = 'students' | 'slots' | 'points' | 'extensions' | 'registrations' | 'studio' | 'refunds' | 'products' | 'tasks' | 'settings' | 'insights';
type BadgeKey = 'students' | 'extensions' | 'registrations' | 'studio' | 'refunds';
type PendingCounts = Record<BadgeKey, number>;

const OPS_TABS = [
  { key: 'students' as const, label: '학생 관리', icon: Users },
  { key: 'slots' as const, label: '예약 관리', icon: Calendar },
  { key: 'points' as const, label: '포인트', icon: Star },
  { key: 'extensions' as const, label: '연장 신청', icon: Clock },
  { key: 'registrations' as const, label: '재등록 관리', icon: ShoppingBag },
  { key: 'studio' as const, label: '음원 작업실', icon: Music2 },
  { key: 'refunds' as const, label: '환불 신청', icon: Calculator },
  { key: 'products' as const, label: '상품 관리', icon: Package },
  { key: 'tasks' as const, label: '과제 관리', icon: ClipboardList },
  { key: 'settings' as const, label: '설정', icon: Settings },
];

export function AdminDashboard() {
  const { profile, signOut } = useAuth();
  const [tab, setTab] = useState<AdminTab>('students');
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [pending, setPending] = useState<PendingCounts>({
    students: 0, extensions: 0, registrations: 0, studio: 0, refunds: 0,
  });

  const fetchCounts = useCallback(async () => {
    const [studRes, extRes, regRes, studioRes, refundRes] = await Promise.all([
      supabase.from('lesson_applications').select('id', { count: 'exact', head: true }).eq('status', 'waiting'),
      supabase.from('extensions').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
      supabase.from('registrations').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
      supabase.from('project_works').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
      supabase.from('registrations').select('id', { count: 'exact', head: true }).eq('status', 'refund_requested'),
    ]);
    setPending({
      students: studRes.count ?? 0,
      extensions: extRes.count ?? 0,
      registrations: regRes.count ?? 0,
      studio: studioRes.count ?? 0,
      refunds: refundRes.count ?? 0,
    });
  }, []);

  useEffect(() => {
    fetchCounts();

    const refetchStudents = () =>
      supabase.from('lesson_applications').select('id', { count: 'exact', head: true }).eq('status', 'waiting')
        .then(({ count }) => setPending(prev => ({ ...prev, students: count ?? 0 })));

    const refetchExtensions = () =>
      supabase.from('extensions').select('id', { count: 'exact', head: true }).eq('status', 'pending')
        .then(({ count }) => setPending(prev => ({ ...prev, extensions: count ?? 0 })));

    const refetchRegistrations = () =>
      Promise.all([
        supabase.from('registrations').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('registrations').select('id', { count: 'exact', head: true }).eq('status', 'refund_requested'),
      ]).then(([regRes, refundRes]) =>
        setPending(prev => ({ ...prev, registrations: regRes.count ?? 0, refunds: refundRes.count ?? 0 }))
      );

    const refetchStudio = () =>
      supabase.from('project_works').select('id', { count: 'exact', head: true }).eq('status', 'pending')
        .then(({ count }) => setPending(prev => ({ ...prev, studio: count ?? 0 })));

    const applicationsCh = supabase.channel('badge-applications')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'lesson_applications' }, refetchStudents)
      .subscribe();
    const extensionsCh = supabase.channel('badge-extensions')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'extensions' }, refetchExtensions)
      .subscribe();
    const registrationsCh = supabase.channel('badge-registrations')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'registrations' }, refetchRegistrations)
      .subscribe();
    const studioCh = supabase.channel('badge-project-works')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'project_works' }, refetchStudio)
      .subscribe();

    return () => {
      supabase.removeChannel(applicationsCh);
      supabase.removeChannel(extensionsCh);
      supabase.removeChannel(registrationsCh);
      supabase.removeChannel(studioCh);
    };
  }, [fetchCounts]);

  if (!profile) return null;

  const navigate = (key: AdminTab) => {
    setTab(key);
    setMobileSidebarOpen(false);
  };

  return (
    <div className="h-screen bg-slate-900 flex flex-col overflow-hidden">
      {/* Top Nav */}
      <nav className="bg-slate-900 border-b border-slate-800 sticky top-0 z-30 h-14 flex-shrink-0">
        <div className="px-4 h-full flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => setMobileSidebarOpen(v => !v)}
              className="md:hidden p-1.5 text-slate-400 hover:text-white transition-colors rounded-lg hover:bg-slate-800"
            >
              {mobileSidebarOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
            <Logo theme="dark" size="sm" />
            <div className="hidden sm:flex items-center gap-1.5 ml-2 bg-amber-400/10 border border-amber-400/20 text-amber-400 text-xs font-medium px-2.5 py-1 rounded-full">
              <Shield size={11} />
              관리자
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-slate-400 text-sm hidden sm:inline">{profile.full_name}</span>
            <button
              onClick={signOut}
              className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-white transition-colors px-3 py-1.5 rounded-lg hover:bg-slate-800"
            >
              <LogOut size={14} />
              <span className="hidden sm:inline">로그아웃</span>
            </button>
          </div>
        </div>
      </nav>

      <div className="flex flex-1 overflow-hidden min-h-0">
        {/* Mobile overlay */}
        {mobileSidebarOpen && (
          <div
            className="fixed inset-0 bg-black/60 z-20 md:hidden"
            onClick={() => setMobileSidebarOpen(false)}
          />
        )}

        {/* Sidebar */}
        <aside
          className={`
            fixed md:sticky top-14 left-0 z-20
            w-56 bg-slate-800 border-r border-slate-700
            flex-shrink-0 flex flex-col
            h-[calc(100vh-56px)] overflow-y-auto
            transition-transform duration-300 ease-in-out
            ${mobileSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
          `}
        >
          <nav className="flex-1 p-3 space-y-0.5">
            {/* Operations group */}
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider px-2 pt-3 pb-2">
              운영
            </p>
            {OPS_TABS.map(({ key, label, icon: Icon }) => {
              const badgeCount = (pending as Record<string, number>)[key] ?? 0;
              const isActive = tab === key;
              return (
                <button
                  key={key}
                  onClick={() => navigate(key)}
                  className={`
                    w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium
                    transition-all text-left border-l-2
                    ${isActive
                      ? 'bg-amber-500/15 text-amber-400 border-amber-400'
                      : 'text-slate-400 hover:text-slate-100 hover:bg-slate-700/50 border-transparent'
                    }
                  `}
                >
                  <Icon size={15} className="shrink-0" />
                  <span className="flex-1 truncate">{label}</span>
                  {badgeCount > 0 && (
                    <span className="min-w-[18px] h-[18px] px-1 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center leading-none">
                      {badgeCount}
                    </span>
                  )}
                </button>
              );
            })}

            {/* Divider */}
            <div className="my-3 border-t border-slate-700" />

            {/* Intelligence group */}
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider px-2 pb-2">
              인텔리전스
            </p>
            <button
              onClick={() => navigate('insights')}
              className={`
                w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium
                transition-all text-left border-l-2
                ${tab === 'insights'
                  ? 'bg-cyan-500/15 text-cyan-400 border-cyan-400'
                  : 'text-slate-400 hover:text-slate-100 hover:bg-slate-700/50 border-transparent'
                }
              `}
            >
              <BarChart2 size={15} className="shrink-0" />
              <span className="flex-1">Insights BI</span>
            </button>
          </nav>
        </aside>

        {/* Main content */}
        <main className={`flex-1 min-w-0 overflow-y-auto ${tab === 'insights' ? 'bg-gray-950' : 'bg-slate-100'}`}>
          {tab === 'insights' ? (
            <InsightsDashboard />
          ) : (
            <div className="max-w-5xl mx-auto p-6">
              {tab === 'students' && <StudentManager onAction={fetchCounts} />}
              {tab === 'slots' && <TimeSlotEditor />}
              {tab === 'points' && <PointsControl />}
              {tab === 'extensions' && <ExtensionManager onAction={fetchCounts} />}
              {tab === 'registrations' && <RegistrationManager onAction={fetchCounts} />}
              {tab === 'studio' && <ProjectStudio onAction={fetchCounts} />}
              {tab === 'refunds' && <RefundCalculator onAction={fetchCounts} />}
              {tab === 'products' && <ProductManager />}
              {tab === 'tasks' && <TaskManager />}
              {tab === 'settings' && <AdminSettings />}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
