import React, { useState, useEffect, useMemo } from 'react';
import { ShoppingBag, CheckCircle, RefreshCw, ChevronDown } from 'lucide-react';
import { supabase, type Profile, type Product } from '../../lib/supabase';
import { sendDiscordNotification, DISCORD_COLORS } from '../../lib/discord';
import { Button } from '../ui/Button';

interface Props {
  profile: Profile;
  futureBookings: number;
}

export function RegistrationRequest({ profile, futureBookings }: Props) {
  const [roots, setRoots] = useState<Product[]>([]);
  const [selectedRootId, setSelectedRootId] = useState('');
  const [categories, setCategories] = useState<Product[]>([]);
  const [leafMap, setLeafMap] = useState<Record<string, Product[]>>({});
  const [selections, setSelections] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(false);
  const [fetchingProducts, setFetchingProducts] = useState(true);
  const [hasPending, setHasPending] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([
      supabase
        .from('products')
        .select('*')
        .is('parent_id', null)
        .eq('expose_on_re_reg', true)
        .order('sort_order'),
      supabase
        .from('registrations')
        .select('id')
        .eq('student_id', profile.id)
        .eq('status', 'pending'),
    ]).then(([prodRes, regRes]) => {
      const prods = prodRes.data || [];
      setRoots(prods);
      setHasPending((regRes.data || []).length > 0);
      setFetchingProducts(false);
    });
  }, [profile.id, submitted]);

  useEffect(() => {
    if (!selectedRootId) return;
    setCategories([]);
    setLeafMap({});
    setSelections({});

    supabase
      .from('products')
      .select('*')
      .eq('parent_id', selectedRootId)
      .eq('expose_on_re_reg', true)
      .order('sort_order')
      .then(({ data: cats }) => {
        if (!cats || cats.length === 0) { setCategories([]); return; }
        setCategories(cats);
        const catIds = cats.map(c => c.id);
        supabase
          .from('products')
          .select('*')
          .in('parent_id', catIds)
          .eq('expose_on_re_reg', true)
          .order('sort_order')
          .then(({ data: leaves }) => {
            const map: Record<string, Product[]> = {};
            catIds.forEach(id => { map[id] = []; });
            (leaves || []).forEach(l => {
              if (l.parent_id && map[l.parent_id]) map[l.parent_id].push(l);
            });
            setLeafMap(map);
          });
      });
  }, [selectedRootId]);

  const totalPrice = useMemo(() => {
    const rootProduct = roots.find(r => r.id === selectedRootId);
    const basePrice = rootProduct?.total_price ?? 0;
    const allLeaves = Object.values(leafMap).flat();
    const optionsPrice = Object.values(selections)
      .flat()
      .reduce((sum, id) => {
        const leaf = allLeaves.find(l => l.id === id);
        return sum + (leaf?.total_price ?? 0);
      }, 0);
    return basePrice + optionsPrice;
  }, [selections, leafMap, selectedRootId, roots]);

  const isProjectWorkPackage = useMemo(() => {
    const allLeaves = Object.values(leafMap).flat();
    return allLeaves.some(l => l.is_project_work);
  }, [leafMap]);

  const ticketLimitBlocked = !!selectedRootId && !isProjectWorkPackage && (profile.tickets + futureBookings) > 2;

  function toggleSelection(catId: string, leafId: string, selectType: string) {
    setSelections(prev => {
      const current = prev[catId] || [];
      if (selectType === 'single') {
        return { ...prev, [catId]: current.includes(leafId) ? [] : [leafId] };
      }
      return {
        ...prev,
        [catId]: current.includes(leafId)
          ? current.filter(id => id !== leafId)
          : [...current, leafId],
      };
    });
  }

  const allSelectedLeafIds = Object.values(selections).flat();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedRootId) return;
    setError('');
    setLoading(true);

    const { error: dbError } = await supabase.from('registrations').insert({
      student_id: profile.id,
      product_id: selectedRootId,
      selected_options: allSelectedLeafIds,
      total_price: totalPrice,
      status: 'pending',
    });

    if (dbError) {
      console.error('🛑 [재등록 DB 저장 실패 원인]:', dbError);
      setError(`신청 중 오류가 발생했습니다. (${dbError.code}: ${dbError.message})`);
      setLoading(false);
      return;
    }

    const rootProduct = roots.find(r => r.id === selectedRootId);
    await sendDiscordNotification(
      '재등록 신청',
      `**학생:** ${profile.full_name}\n**상품:** ${rootProduct?.name ?? '—'}\n**금액:** ${totalPrice.toLocaleString()}원`,
      DISCORD_COLORS.INFO
    );

    setSubmitted(true);
    setLoading(false);
  }

  if (fetchingProducts) {
    return (
      <div className="flex items-center justify-center gap-2 text-[#475569] text-sm py-8">
        <RefreshCw size={14} className="animate-spin" />
        상품 불러오는 중...
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <h3 className="font-semibold text-white mb-0.5 flex items-center gap-2">
          <ShoppingBag size={16} className="text-[#22d3ee]" />
          재등록 / 상품 구매
        </h3>
        <p className="text-xs text-[#475569]">상품을 선택하고 신청하면 관리자 확인 후 처리됩니다.</p>
      </div>

      {hasPending ? (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 flex items-start gap-3">
          <CheckCircle size={16} className="text-amber-400 mt-0.5 shrink-0" />
          <div>
            <p className="text-gray-300 font-medium">입금 계좌: 국민은행 94030200022795 
              <span className="text-gray-400 text-sm ml-2">(예금주: 이재인)</span>
  </p>
            <p className="text-sm font-medium text-amber-300">입금 확인 대기 중</p>
            <p className="text-xs text-amber-400/70 mt-0.5">신청이 접수되었습니다. 입금 확인 후 관리자가 승인해 드립니다.</p>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <p className="text-sm text-red-400">{error}</p>}

          {roots.length === 0 ? (
            <p className="text-sm text-[#334155]">현재 등록된 상품이 없습니다.</p>
          ) : (
            <div>
              <label className="text-sm font-medium text-[#8fa0dd] block mb-2">
                상품 선택 <span className="text-[#22d3ee]">*</span>
              </label>
              <div className="space-y-2">
                {roots.map(root => (
                  <label
                    key={root.id}
                    className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all
                      ${selectedRootId === root.id
                        ? 'border-[#22d3ee]/60 bg-[#22d3ee]/10'
                        : 'border-[#1e2940] bg-[#0b0f19] hover:border-[#2d3f5e]'
                      }`}
                  >
                    <input
                      type="radio"
                      name="root_product"
                      value={root.id}
                      checked={selectedRootId === root.id}
                      onChange={() => setSelectedRootId(root.id)}
                      className="mt-0.5 accent-[#22d3ee]"
                    />
                    <div className="flex-1">
                      <div className={`text-sm font-medium ${selectedRootId === root.id ? 'text-[#22d3ee]' : 'text-white'}`}>{root.name}</div>
                      <div className="text-xs text-[#475569] mt-0.5">
                        {root.total_price > 0 && `${root.total_price.toLocaleString()}원`}
                        {root.tickets > 0 && ` · ${root.tickets}회`}
                        {root.duration_days ? ` · ${root.duration_days}일` : ''}
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          )}

          {selectedRootId && categories.length > 0 && (
            <div className="space-y-3 pt-1">
              {categories.map((cat, catIdx) => {
                const leaves = leafMap[cat.id] || [];
                const catSelections = selections[cat.id] || [];
                const prevCat = catIdx > 0 ? categories[catIdx - 1] : null;
                const isLocked = prevCat !== null
                  && prevCat.select_type === 'single'
                  && (selections[prevCat.id] || []).length === 0;
                return (
                  <div key={cat.id} className={`border rounded-xl overflow-hidden transition-opacity ${isLocked ? 'border-[#1a2236] opacity-50' : 'border-[#1e2940]'}`}>
                    <div className={`px-4 py-2.5 border-b flex items-center gap-2 ${isLocked ? 'bg-[#0d1117] border-[#1a2236]' : 'bg-[#0b0f19] border-[#1e2940]'}`}>
                      <ChevronDown size={13} className="text-[#334155]" />
                      <span className="text-sm font-medium text-[#8fa0dd]">{cat.name}</span>
                      {isLocked ? (
                        <span className="text-xs text-[#334155] ml-1">(이전 옵션 선택 시 선택 가능)</span>
                      ) : (
                        <span className="text-xs text-[#334155] ml-1">
                          ({cat.select_type === 'multiple' ? '다중 선택 가능' : '하나 선택'})
                        </span>
                      )}
                    </div>
                    <div className="divide-y divide-[#1a2236]">
                      {leaves.length === 0 ? (
                        <p className="px-4 py-3 text-xs text-[#334155]">옵션이 없습니다.</p>
                      ) : (
                        leaves.map(leaf => {
                          const isChecked = catSelections.includes(leaf.id);
                          return (
                            <label
                              key={leaf.id}
                              className={`flex items-center gap-3 px-4 py-3 transition-colors
                                ${isLocked ? 'cursor-not-allowed bg-[#0b0f19]' : 'cursor-pointer bg-[#0b0f19]'}
                                ${isChecked && !isLocked ? 'bg-[#22d3ee]/5' : (!isLocked ? 'hover:bg-[#141b2d]' : '')}`}
                            >
                              <input
                                type={cat.select_type === 'multiple' ? 'checkbox' : 'radio'}
                                name={`cat_${cat.id}`}
                                checked={isChecked}
                                disabled={isLocked}
                                onChange={() => !isLocked && toggleSelection(cat.id, leaf.id, cat.select_type || 'single')}
                                className="accent-[#22d3ee] disabled:opacity-40"
                              />
                              <span className={`text-sm flex-1 ${isLocked ? 'text-[#334155]' : isChecked ? 'text-[#22d3ee]' : 'text-[#cbd5e1]'}`}>
                                {leaf.name}
                              </span>
                              {leaf.total_price > 0 && (
                                <span className={`text-xs font-medium ${isLocked ? 'text-[#334155]' : 'text-[#475569]'}`}>
                                  +{leaf.total_price.toLocaleString()}원
                                </span>
                              )}
                            </label>
                          );
                        })
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {totalPrice > 0 && (
            <div className="flex items-center justify-between py-3 px-4 bg-[#0b0f19] border border-[#1e2940] rounded-xl">
              <span className="text-sm font-medium text-[#8fa0dd]">총 결제 금액</span>
              <span className="text-base font-bold text-[#22d3ee]">{totalPrice.toLocaleString()}원</span>
            </div>
          )}

          {ticketLimitBlocked && (
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 text-xs text-amber-400 text-center">
              잔여 티켓이 3장 이상이면 재등록 신청이 불가합니다. (현재 {profile.tickets}장 보유)
            </div>
          )}

          <Button
            type="submit"
            variant="cyan"
            loading={loading}
            disabled={!selectedRootId || roots.length === 0 || ticketLimitBlocked}
            className="w-full justify-center"
          >
            결제 신청하기
          </Button>
        </form>
      )}
    </div>
  );
}
