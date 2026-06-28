import React, { useState, useEffect, useCallback } from 'react';
import { Check, RotateCcw, ChevronDown } from 'lucide-react';
import { supabase } from '../../lib/supabase';

const TASK_DISCOUNT = 20000;

interface TaskRow {
  id: string;
  student_id: string;
  student_name: string;
  task_1: boolean;
  task_2: boolean;
  task_3: boolean;
  task_4: boolean;
  extra_discount: number;
}

export function TaskManager() {
  const [rows, setRows] = useState<TaskRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [expandedStudents, setExpandedStudents] = useState<Set<string>>(new Set());

  const fetchData = useCallback(async () => {
    setLoading(true);
    const { data: students } = await supabase
      .from('profiles')
      .select('id, full_name')
      .eq('role', 'student')
      .eq('status', 'active')
      .order('full_name');

    // month 필터 제거
    const { data: tasks } = await supabase
      .from('task_assignments')
      .select('*');

    const taskMap = new Map((tasks || []).map(t => [t.student_id, t]));

    const merged: TaskRow[] = (students || []).map(s => {
      const t = taskMap.get(s.id);
      return {
        id: t?.id || '',
        student_id: s.id,
        student_name: s.full_name,
        task_1: t?.task_1 || false,
        task_2: t?.task_2 || false,
        task_3: t?.task_3 || false,
        task_4: t?.task_4 || false,
        extra_discount: t?.extra_discount || 0,
      };
    });

    setRows(merged);
    setLoading(false);
  }, []); // 의존성 배열에서 month 제거

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  async function toggleTask(studentId: string, taskNum: 1 | 2 | 3 | 4) {
    const row = rows.find(r => r.student_id === studentId);
    if (!row) return;

    setSaving(studentId);
    const newValue = !row[`task_${taskNum}` as keyof TaskRow] as boolean;

    // month 필터 제거
    const { data: existing } = await supabase
      .from('task_assignments')
      .select('id')
      .eq('student_id', studentId)
      .maybeSingle();

    if (existing) {
      await supabase
        .from('task_assignments')
        .update({ [`task_${taskNum}`]: newValue, updated_at: new Date().toISOString() })
        .eq('id', existing.id);
    } else {
      await supabase.from('task_assignments').insert({
        student_id: studentId,
        [`task_${taskNum}`]: newValue,
      });
    }

    setRows(prev => prev.map(r =>
      r.student_id === studentId ? { ...r, [`task_${taskNum}`]: newValue } : r
    ));
    setSaving(null);
  }

  async function updateExtra(studentId: string, value: number) {
    setSaving(studentId);

    // month 필터 제거
    const { data: existing } = await supabase
      .from('task_assignments')
      .select('id')
      .eq('student_id', studentId)
      .maybeSingle();

    if (existing) {
      await supabase
        .from('task_assignments')
        .update({ extra_discount: value, updated_at: new Date().toISOString() })
        .eq('id', existing.id);
    } else {
      await supabase.from('task_assignments').insert({
        student_id: studentId,
        extra_discount: value,
      });
    }

    setRows(prev => prev.map(r =>
      r.student_id === studentId ? { ...r, extra_discount: value } : r
    ));
    setSaving(null);
  }

  async function resetStudent(studentId: string) {
    setSaving(studentId);
    
    // month 필터 제거
    await supabase.from('task_assignments')
      .update({
        task_1: false,
        task_2: false,
        task_3: false,
        task_4: false,
        extra_discount: 0,
        updated_at: new Date().toISOString(),
      })
      .eq('student_id', studentId);

    setRows(prev => prev.map(r =>
      r.student_id === studentId
        ? { ...r, task_1: false, task_2: false, task_3: false, task_4: false, extra_discount: 0 }
        : r
    ));
    setSaving(null);
  }

  function calcTotal(r: TaskRow) {
    const tasks = [r.task_1, r.task_2, r.task_3, r.task_4].filter(Boolean).length;
    return tasks * TASK_DISCOUNT + r.extra_discount;
  }

  const toggleExpand = (studentId: string) => {
    setExpandedStudents(prev => {
      const next = new Set(prev);
      if (next.has(studentId)) {
        next.delete(studentId);
      } else {
        next.add(studentId);    
      }
      return next;
    });
  };

  return (
    <div className="space-y-4">
      {/* 헤더 영역 (달력 UI 영구 삭제) */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
        <h2 className="text-lg font-bold text-slate-800">과제 관리</h2>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <svg className="animate-spin h-6 w-6 text-amber-400" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          
          <table className="w-full text-sm hidden md:table">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-slate-700">학생</th>
                <th className="px-3 py-3 text-center font-semibold text-slate-700">과제 1</th>
                <th className="px-3 py-3 text-center font-semibold text-slate-700">과제 2</th>
                <th className="px-3 py-3 text-center font-semibold text-slate-700">과제 3</th>
                <th className="px-3 py-3 text-center font-semibold text-slate-700">과제 4</th>
                <th className="px-3 py-3 text-center font-semibold text-slate-700">추가 할인</th>
                <th className="px-3 py-3 text-center font-semibold text-slate-700">총 할인</th>
                <th className="px-3 py-3 text-center font-semibold text-slate-700">리셋</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(row => {
                const total = calcTotal(row);
                const isSaving = saving === row.student_id;
                return (
                  <tr key={row.student_id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="px-4 py-2.5 font-medium text-slate-800">{row.student_name}</td>
                    {[1, 2, 3, 4].map(n => {
                      const checked = row[`task_${n}` as keyof TaskRow] as boolean;
                      return (
                        <td key={n} className="px-3 py-2.5 text-center">
                          <button
                            onClick={() => toggleTask(row.student_id, n as 1 | 2 | 3 | 4)}
                            disabled={isSaving}
                            className={`
                              w-7 h-7 rounded-lg flex items-center justify-center mx-auto transition-all
                              ${checked ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-400 hover:bg-slate-200'}
                            `}
                          >
                            {checked ? <Check size={14} /> : null}
                          </button>
                        </td>
                      );
                    })}
                    <td className="px-3 py-2.5 text-center">
                      <input
                        type="number"
                        value={row.extra_discount || ''}
                        onChange={e => {
                          const val = parseInt(e.target.value) || 0;
                          setRows(prev => prev.map(r =>
                            r.student_id === row.student_id ? { ...r, extra_discount: val } : r
                          ));
                        }}
                        onBlur={e => updateExtra(row.student_id, parseInt(e.target.value) || 0)}
                        onKeyDown={e => {
                          if (e.key === 'Enter') {
                            updateExtra(row.student_id, parseInt((e.target as HTMLInputElement).value) || 0);
                          }
                        }}
                        step={10000}
                        placeholder="0"
                        className="w-28 px-2 py-1.5 text-center border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                      />
                      <span className="text-xs text-slate-400 ml-1">원</span>
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      <span className="font-bold text-amber-600">{total.toLocaleString()}원</span>
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      <button
                        onClick={() => resetStudent(row.student_id)}
                        disabled={isSaving}
                        className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                        title="리셋"
                      >
                        <RotateCcw size={14} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          <div className="md:hidden divide-y divide-slate-100">
            {rows.map(row => {
              const total = calcTotal(row);
              const isSaving = saving === row.student_id;
              const isExpanded = expandedStudents.has(row.student_id);

              return (
                <div key={row.student_id} className="overflow-hidden">
                  <button
                    onClick={() => toggleExpand(row.student_id)}
                    className="w-full p-4 flex items-center justify-between hover:bg-slate-50 gap-3 text-left focus:outline-none"
                  >
                    <div>
                      <div className="font-medium text-slate-800 text-base">{row.student_name}</div>
                      {!isExpanded && (
                        <div className="text-xs text-amber-600 font-medium pt-0.5">
                          총 할인: {total.toLocaleString()}원
                        </div>
                      )}
                    </div>
                    <ChevronDown 
                      size={20} 
                      className={`text-slate-400 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} 
                    />
                  </button>

                  {isExpanded && (
                    <div className="px-4 pb-4 pt-1 space-y-3 bg-slate-50/50 border-t border-slate-100">
                      <div className="flex justify-end">
                         <button
                          onClick={() => resetStudent(row.student_id)}
                          disabled={isSaving}
                          className="flex items-center gap-1.5 px-2.5 py-1 text-xs text-slate-500 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all border border-slate-200 bg-white"
                          title="데이터 리셋"
                        >
                          <RotateCcw size={12} />
                          초기화
                        </button>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        {[1, 2, 3, 4].map(n => {
                          const checked = row[`task_${n}` as keyof TaskRow] as boolean;
                          return (
                            <div key={n} className="flex items-center gap-2 p-2 bg-white border border-slate-100 rounded-lg">
                              <button
                                onClick={() => toggleTask(row.student_id, n as 1 | 2 | 3 | 4)}
                                disabled={isSaving}
                                className={`
                                  w-8 h-8 rounded-lg flex items-center justify-center transition-all focus:outline-none focus:ring-2 focus:ring-emerald-300
                                  ${checked ? 'bg-emerald-500 text-white' : 'bg-white border border-slate-200 text-slate-300 hover:bg-slate-100'}
                                `}
                              >
                                {checked ? <Check size={16} /> : null}
                              </button>
                              <div className="text-sm font-medium text-slate-700">과제 {n}</div>
                            </div>
                          );
                        })}
                      </div>

                      <div className="space-y-2.5 pt-2 border-t border-slate-100">
                        <div className="flex items-center gap-2">
                          <div className="text-sm text-slate-600">추가 할인</div>
                          <input
                            type="number"
                            value={row.extra_discount || ''}
                            onChange={e => {
                              const val = parseInt(e.target.value) || 0;
                              setRows(prev => prev.map(r =>
                                r.student_id === row.student_id ? { ...r, extra_discount: val } : r
                              ));
                            }}
                            onBlur={e => updateExtra(row.student_id, parseInt(e.target.value) || 0)}
                            onKeyDown={e => {
                              if (e.key === 'Enter') {
                                updateExtra(row.student_id, parseInt((e.target as HTMLInputElement).value) || 0);
                              }
                            }}
                            step={10000}
                            placeholder="0"
                            className="flex-grow px-3 py-1.5 text-right border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                          />
                          <span className="text-xs text-slate-400">원</span>
                        </div>

                        <div className="flex items-center justify-between gap-2 p-2 bg-amber-50 rounded-lg">
                          <div className="text-sm font-semibold text-amber-900">총 할인</div>
                          <div className="font-bold text-xl text-amber-600">{total.toLocaleString()}원</div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {rows.length === 0 && (
            <div className="text-center py-12 text-slate-400">
              활성 학생이 없습니다.
            </div>
          )}
        </div>
      )}
    </div>
  );
}