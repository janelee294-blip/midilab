import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Package, Plus, Save, Trash2, RefreshCw, Pencil, X, ChevronRight, Tag } from 'lucide-react';
import { supabase, type Product } from '../../lib/supabase';
import { Button } from '../ui/Button';

type EditMode =
  | { kind: 'edit'; id: string }
  | { kind: 'new'; parentId: string | null };

type FormState = {
  name: string;
  total_price: number;
  unit_price: number;
  tickets: number;
  sort_order: number;
  duration_days: number | null;
  parent_id: string | null;
  select_type: 'single' | 'multiple';
  is_project_work: boolean;
  expose_on_signup: boolean;
  expose_on_re_reg: boolean;
};

const EMPTY_FORM: FormState = {
  name: '',
  total_price: 0,
  unit_price: 0,
  tickets: 0,
  sort_order: 0,
  duration_days: null,
  parent_id: null,
  select_type: 'single',
  is_project_work: false,
  expose_on_signup: true,
  expose_on_re_reg: true,
};

function getProductLevel(p: Product, all: Product[]): 1 | 2 | 3 {
  if (!p.parent_id) return 1;
  const parent = all.find(x => x.id === p.parent_id);
  if (!parent?.parent_id) return 2;
  return 3;
}

export function ProductManager() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const hasLoadedRef = useRef(false);
  const [mode, setMode] = useState<EditMode | null>(null);
  const [form, setForm] = useState<FormState>({ ...EMPTY_FORM });
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  const showToast = (msg: string, ok: boolean) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3000);
  };

  const loadProducts = useCallback(async () => {
    if (!hasLoadedRef.current) setLoading(true);
    const { data } = await supabase.from('products').select('*').order('sort_order').order('created_at');
    setProducts(data || []);
    setLoading(false);
    hasLoadedRef.current = true;
  }, []);

  useEffect(() => { loadProducts(); }, [loadProducts]);

  function startEdit(product: Product) {
    setMode({ kind: 'edit', id: product.id });
    setForm({
      name: product.name,
      total_price: product.total_price,
      unit_price: product.unit_price,
      tickets: product.tickets,
      sort_order: product.sort_order,
      duration_days: product.duration_days ?? null,
      parent_id: product.parent_id ?? null,
      select_type: product.select_type || 'single',
      is_project_work: product.is_project_work ?? false,
      expose_on_signup: product.expose_on_signup ?? true,
      expose_on_re_reg: product.expose_on_re_reg ?? true,
    });
  }

  function startNew(parentId: string | null) {
    setMode({ kind: 'new', parentId });
    const siblingCount = products.filter(p => p.parent_id === parentId).length;
    setForm({ ...EMPTY_FORM, parent_id: parentId, sort_order: siblingCount + 1 });
  }

  function cancelMode() {
    setMode(null);
  }

  async function handleSave() {
    if (!form.name.trim()) { showToast('상품명을 입력하세요.', false); return; }
    setSaving(true);
    if (mode?.kind === 'new') {
      const { error } = await supabase.from('products').insert(form);
      if (error) showToast('저장 실패: ' + error.message, false);
      else { showToast('추가되었습니다.', true); setMode(null); }
    } else if (mode?.kind === 'edit') {
      const { error } = await supabase.from('products').update(form).eq('id', mode.id);
      if (error) showToast('저장 실패: ' + error.message, false);
      else { showToast('수정되었습니다.', true); setMode(null); }
    }
    setSaving(false);
    loadProducts();
  }

  async function handleDelete(id: string) {
    if (!window.confirm('삭제하면 하위 항목도 모두 삭제됩니다. 계속하시겠습니까?')) return;
    const { error } = await supabase.from('products').delete().eq('id', id);
    if (error) showToast('삭제 실패: ' + error.message, false);
    else { showToast('삭제되었습니다.', true); loadProducts(); }
  }

  const roots = products.filter(p => !p.parent_id);

  function levelOf(p: Product) { return getProductLevel(p, products); }

  return (
    <div className="space-y-5">
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-xl shadow-lg text-sm font-medium border
          ${toast.ok ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
          {toast.msg}
        </div>
      )}

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Package size={16} className="text-slate-500" />
            <h3 className="font-semibold text-slate-900">레슨 상품 관리</h3>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="ghost" onClick={loadProducts}><RefreshCw size={14} /></Button>
            {!(mode?.kind === 'new' && mode.parentId === null) && (
              <Button size="sm" variant="primary" onClick={() => startNew(null)}>
                <Plus size={14} />메인 상품
              </Button>
            )}
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12 text-slate-400">
            <RefreshCw size={18} className="animate-spin mr-2" />불러오는 중...
          </div>
        ) : (
          <div>
            {mode?.kind === 'new' && mode.parentId === null && (
              <ProductFormRow
                form={form} onChange={setForm} onSave={handleSave}
                onCancel={cancelMode} saving={saving} level={1} label="새 메인 상품 추가"
              />
            )}

            {roots.length === 0 && !(mode?.kind === 'new') ? (
              <div className="text-center py-10 text-slate-400 text-sm">등록된 상품이 없습니다.</div>
            ) : (
              roots.map(root => {
                const level2 = products.filter(p => p.parent_id === root.id);
                return (
                  <div key={root.id} className="border-b border-slate-100 last:border-0">
                    {/* Level 1 */}
                    {mode?.kind === 'edit' && mode.id === root.id ? (
                      <ProductFormRow
                        form={form} onChange={setForm} onSave={handleSave}
                        onCancel={cancelMode} saving={saving} level={1} label="메인 상품 수정"
                      />
                    ) : (
                      <div className="px-5 py-4 flex items-center gap-3 bg-white">
                        <Package size={15} className="text-amber-500 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold text-slate-900 text-sm">{root.name}</span>
                            {!root.expose_on_signup && (
                              <span className="text-xs bg-slate-100 text-slate-400 px-1.5 py-0.5 rounded">신규신청 비노출</span>
                            )}
                            {!root.expose_on_re_reg && (
                              <span className="text-xs bg-slate-100 text-slate-400 px-1.5 py-0.5 rounded">재등록 비노출</span>
                            )}
                          </div>
                          <div className="flex items-center gap-3 mt-0.5 text-xs text-slate-400 flex-wrap">
                            {root.total_price > 0 && <span>{root.total_price.toLocaleString()}원</span>}
                            {root.tickets > 0 && <span>{root.tickets}장</span>}
                            {root.duration_days
                              ? <span className="text-blue-500">{root.duration_days}일</span>
                              : <span>기간무제한</span>}
                          </div>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <Button size="sm" variant="ghost" onClick={() => startNew(root.id)}>
                            <Plus size={13} /><span className="text-xs">카테고리</span>
                          </Button>
                          <button onClick={() => startEdit(root)}
                            className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-700">
                            <Pencil size={13} />
                          </button>
                          <button onClick={() => handleDelete(root.id)}
                            className="p-1.5 hover:bg-red-50 rounded-lg text-slate-400 hover:text-red-500">
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Level 2 */}
                    {level2.map(cat => {
                      const level3 = products.filter(p => p.parent_id === cat.id);
                      return (
                        <div key={cat.id}>
                          {mode?.kind === 'edit' && mode.id === cat.id ? (
                            <div className="pl-8">
                              <ProductFormRow
                                form={form} onChange={setForm} onSave={handleSave}
                                onCancel={cancelMode} saving={saving} level={2} label="카테고리 수정"
                              />
                            </div>
                          ) : (
                            <div className="pl-8 pr-5 py-3 flex items-center gap-3 bg-slate-50/60 border-t border-slate-100">
                              <ChevronRight size={12} className="text-slate-300 shrink-0" />
                              <Tag size={13} className="text-slate-400 shrink-0" />
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="font-medium text-slate-700 text-sm">{cat.name}</span>
                                  <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                                    cat.select_type === 'multiple'
                                      ? 'bg-violet-100 text-violet-600'
                                      : 'bg-sky-100 text-sky-600'
                                  }`}>
                                    {cat.select_type === 'multiple' ? '다중선택' : '단일선택'}
                                  </span>
                                  {!cat.expose_on_re_reg && (
                                    <span className="text-xs bg-slate-100 text-slate-400 px-1.5 py-0.5 rounded">재등록 비노출</span>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center gap-1 shrink-0">
                                <Button size="sm" variant="ghost" onClick={() => startNew(cat.id)}>
                                  <Plus size={13} /><span className="text-xs">옵션</span>
                                </Button>
                                <button onClick={() => startEdit(cat)}
                                  className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-700">
                                  <Pencil size={13} />
                                </button>
                                <button onClick={() => handleDelete(cat.id)}
                                  className="p-1.5 hover:bg-red-50 rounded-lg text-slate-400 hover:text-red-500">
                                  <Trash2 size={13} />
                                </button>
                              </div>
                            </div>
                          )}

                          {/* Level 3 */}
                          {level3.map(leaf => (
                            mode?.kind === 'edit' && mode.id === leaf.id ? (
                              <div key={leaf.id} className="pl-16">
                                <ProductFormRow
                                  form={form} onChange={setForm} onSave={handleSave}
                                  onCancel={cancelMode} saving={saving} level={3} label="옵션 수정"
                                />
                              </div>
                            ) : (
                              <div key={leaf.id}
                                className="pl-16 pr-5 py-2.5 flex items-center gap-3 border-t border-slate-50 bg-white">
                                <ChevronRight size={11} className="text-slate-200 shrink-0" />
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="text-sm text-slate-700">{leaf.name}</span>
                                    {leaf.total_price > 0 && (
                                      <span className="text-xs text-slate-400">{leaf.total_price.toLocaleString()}원</span>
                                    )}
                                    {leaf.is_project_work && (
                                      <span className="text-xs bg-rose-50 text-rose-600 border border-rose-100 px-1.5 py-0.5 rounded-full">
                                        음원작업
                                      </span>
                                    )}
                                    {!leaf.expose_on_re_reg && (
                                      <span className="text-xs bg-slate-100 text-slate-400 px-1.5 py-0.5 rounded">재등록 비노출</span>
                                    )}
                                  </div>
                                </div>
                                <div className="flex items-center gap-1 shrink-0">
                                  <button onClick={() => startEdit(leaf)}
                                    className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-700">
                                    <Pencil size={13} />
                                  </button>
                                  <button onClick={() => handleDelete(leaf.id)}
                                    className="p-1.5 hover:bg-red-50 rounded-lg text-slate-400 hover:text-red-500">
                                    <Trash2 size={13} />
                                  </button>
                                </div>
                              </div>
                            )
                          ))}

                          {/* New level-3 form */}
                          {mode?.kind === 'new' && mode.parentId === cat.id && (
                            <div className="pl-16">
                              <ProductFormRow
                                form={form} onChange={setForm} onSave={handleSave}
                                onCancel={cancelMode} saving={saving} level={3} label="새 옵션 추가"
                              />
                            </div>
                          )}
                        </div>
                      );
                    })}

                    {/* New level-2 form */}
                    {mode?.kind === 'new' && mode.parentId === root.id && (
                      <div className="pl-8">
                        <ProductFormRow
                          form={form} onChange={setForm} onSave={handleSave}
                          onCancel={cancelMode} saving={saving} level={2} label="새 카테고리 추가"
                        />
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">
        <strong>구조:</strong> 메인 상품(1단계) → 하위 카테고리(2단계, 선택 방식 지정) → 최종 옵션(3단계, 금액·음원작업 여부 설정)
      </div>
    </div>
  );
}

// Suppress unused warning — levelOf is used inside JSX expressions above
// eslint-disable-next-line @typescript-eslint/no-unused-vars
type _LevelOf = ReturnType<typeof getProductLevel>;

function ProductFormRow({
  form, onChange, onSave, onCancel, saving, level, label,
}: {
  form: FormState;
  onChange: (f: FormState) => void;
  onSave: () => void;
  onCancel: () => void;
  saving: boolean;
  level: 1 | 2 | 3;
  label: string;
}) {
  const set = (key: keyof FormState, val: string | number | boolean | null) =>
    onChange({ ...form, [key]: val });

  return (
    <div className="px-5 py-4 bg-slate-50 border-t border-slate-100">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-xs font-semibold text-slate-600 uppercase tracking-wide">{label}</span>
      </div>
      <div className="grid grid-cols-2 gap-3 mb-3">
        <div className="col-span-2">
          <label className="text-xs text-slate-500 block mb-1">이름 *</label>
          <input
            value={form.name}
            onChange={e => set('name', e.target.value)}
            placeholder={
              level === 1 ? '예: 베이직 패키지 (4회)'
              : level === 2 ? '예: 레슨 유형'
              : '예: 4회 레슨'
            }
            className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-400/50"
          />
        </div>

        {level === 2 && (
          <div className="col-span-2">
            <label className="text-xs text-slate-500 block mb-1">선택 유형</label>
            <select
              value={form.select_type}
              onChange={e => set('select_type', e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-400/50 bg-white"
            >
              <option value="single">단일 선택 (라디오)</option>
              <option value="multiple">다중 선택 (체크박스)</option>
            </select>
          </div>
        )}

        {(level === 1 || level === 3) && (
          <div>
            <label className="text-xs text-slate-500 block mb-1">
              {level === 1 ? '총 결제금액 (원)' : '금액 (원)'}
            </label>
            <input
              type="number" step={10000}
              value={form.total_price}
              onChange={e => set('total_price', Number(e.target.value))}
              className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-400/50"
            />
          </div>
        )}

        {level === 1 && (
          <>
            <div>
              <label className="text-xs text-slate-500 block mb-1">단가 (원)</label>
              <input
                type="number" step={10000}
                value={form.unit_price}
                onChange={e => set('unit_price', Number(e.target.value))}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-400/50"
              />
            </div>
            <div>
              <label className="text-xs text-slate-500 block mb-1">부여 티켓 수</label>
              <input
                type="number" step={1}
                value={form.tickets}
                onChange={e => set('tickets', Number(e.target.value))}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-400/50"
              />
            </div>
            <div>
              <label className="text-xs text-slate-500 block mb-1">유효 기간 (일, 비워두면 무제한)</label>
              <input
                type="number"
                value={form.duration_days ?? ''}
                placeholder="예: 30"
                onChange={e => set('duration_days', e.target.value === '' ? null : Number(e.target.value))}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-400/50"
              />
            </div>
          </>
        )}

        <div>
          <label className="text-xs text-slate-500 block mb-1">정렬 순서</label>
          <input
            type="number" step={1}
            value={form.sort_order}
            onChange={e => set('sort_order', Number(e.target.value))}
            className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-400/50"
          />
        </div>

        <div className="flex flex-col gap-2 pt-4">
          <div className="flex items-center gap-2">
            <input
              type="checkbox" id="pf_expose_signup"
              checked={form.expose_on_signup}
              onChange={e => set('expose_on_signup', e.target.checked)}
              className="rounded"
            />
            <label htmlFor="pf_expose_signup" className="text-sm text-slate-700">신규 신청서에 노출</label>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox" id="pf_expose_rereg"
              checked={form.expose_on_re_reg}
              onChange={e => set('expose_on_re_reg', e.target.checked)}
              className="rounded"
            />
            <label htmlFor="pf_expose_rereg" className="text-sm text-slate-700">재등록 화면에 노출</label>
          </div>
          {level === 3 && (
            <div className="flex items-center gap-2">
              <input
                type="checkbox" id="pf_is_project_work"
                checked={form.is_project_work}
                onChange={e => set('is_project_work', e.target.checked)}
                className="rounded"
              />
              <label htmlFor="pf_is_project_work" className="text-sm text-slate-700">
                승인 시 음원 작업실로 전송
              </label>
            </div>
          )}
        </div>
      </div>

      <div className="flex gap-2">
        <Button size="sm" variant="secondary" onClick={onCancel}>
          <X size={13} />취소
        </Button>
        <Button size="sm" variant="primary" loading={saving} onClick={onSave}>
          <Save size={13} />저장
        </Button>
      </div>
    </div>
  );
}
