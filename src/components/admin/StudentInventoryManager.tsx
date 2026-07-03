import React, { useState, useEffect, useMemo } from 'react';
import { Package, X, Plus, Minus, RefreshCw, Trash2, Filter } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { Button } from '../ui/Button';
import { STUDIO_ASSETS, type StudioAsset } from '../../mystudio/studioAssets';

interface Props {
  studentId: string;
}

export function StudentInventoryManager({ studentId }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [inventory, setInventory] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  
  const [selectedItemId, setSelectedItemId] = useState<string>('');
  const [qty, setQty] = useState<number>(1);
  const [obtainFilter, setObtainFilter] = useState<string>('all');
  const [gradeFilter, setGradeFilter] = useState<string>('all');

  useEffect(() => {
    if (isOpen) loadInventory();
  }, [isOpen, studentId]);

  async function loadInventory() {
    setLoading(true);
    const { data, error } = await supabase
      .from('profiles')
      .select('inventory')
      .eq('id', studentId)
      .single();
    
    if (data && data.inventory) {
      setInventory(data.inventory as Record<string, number>);
    } else {
      setInventory({});
    }
    setLoading(false);
  }

  async function handleUpdateInventory(newInv: Record<string, number>) {
    setSaving(true);
    const { error } = await supabase
      .from('profiles')
      .update({ inventory: newInv })
      .eq('id', studentId);
      
    if (!error) setInventory(newInv);
    setSaving(false);
  }

  function handleGrant() {
    if (!selectedItemId || qty <= 0) return;
    const next = { ...inventory };
    next[selectedItemId] = (next[selectedItemId] || 0) + qty;
    handleUpdateInventory(next);
    setSelectedItemId('');
    setQty(1);
  }

  function handleRevoke(itemId: string, amount: number) {
    const next = { ...inventory };
    if (next[itemId]) {
      next[itemId] -= amount;
      if (next[itemId] <= 0) delete next[itemId];
      handleUpdateInventory(next);
    }
  }

  function handleDeleteAll(itemId: string) {
    const next = { ...inventory };
    delete next[itemId];
    handleUpdateInventory(next);
  }

  const filteredAssets = useMemo(() => {
    return STUDIO_ASSETS.filter(asset => {
      const matchObtain = obtainFilter === 'all' || asset.obtain.includes(obtainFilter as any);
      const matchGrade = gradeFilter === 'all' || asset.grade === gradeFilter;
      return matchObtain && matchGrade;
    });
  }, [obtainFilter, gradeFilter]);

  const activeInventory = Object.entries(inventory).filter(([_, amount]) => amount > 0);

  function getItemDisplayName(id: string) {
    const found = STUDIO_ASSETS.find(asset => asset.id === id);
    return found ? `${found.icon} ${found.name}` : id;
  }

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        type="button"
        className="w-full flex items-center justify-center gap-1.5 py-2 bg-white border border-slate-200 text-slate-700 rounded-xl text-xs font-medium hover:bg-slate-50 hover:border-slate-300 transition-all shadow-sm"
      >
        <Package size={14} className="text-slate-500" />
        인벤토리 관리
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-[99999] bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 shadow-2xl rounded-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[85vh] animate-in fade-in zoom-in-95 duration-200">
            
            <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between bg-slate-50 shrink-0">
              <div className="flex items-center gap-2 text-slate-800 font-bold text-sm">
                <Package size={16} className="text-slate-600" />
                학생 인벤토리 관리
              </div>
              <button 
                onClick={() => setIsOpen(false)} 
                type="button"
                className="text-slate-400 hover:text-red-500 p-1 rounded-md hover:bg-red-50 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-4 overflow-y-auto flex-1">
              {loading ? (
                <div className="flex items-center justify-center py-10 text-slate-400 text-sm">
                  <RefreshCw size={16} className="animate-spin mr-2" />
                  데이터 불러오는 중...
                </div>
              ) : (
                <div className="space-y-6">
                  
                  {/* 보유 현황 리스트 */}
                  <div>
                    <label className="text-xs font-bold text-slate-500 mb-2 block">보유 아이템 현황</label>
                    {activeInventory.length === 0 ? (
                      <div className="text-center py-8 bg-slate-50 rounded-xl border border-slate-100 text-xs text-slate-400">
                        보유한 아이템이 없습니다.
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {activeInventory.map(([id, amount]) => (
                          <div key={id} className="flex items-center justify-between bg-slate-50 border border-slate-100 px-3 py-2 rounded-xl">
                            <span className="text-sm font-medium text-slate-700">{getItemDisplayName(id)}</span>
                            <div className="flex items-center gap-2 shrink-0">
                              {/* 🚨 교정: whitespace-nowrap 및 min-w 추가로 세 자리 수 이상일 때 줄바꿈 원천 차단 */}
                              <span className="text-sm font-bold text-slate-900 min-w-[3rem] text-right mr-1 whitespace-nowrap">{amount}개</span>
                              <button 
                                onClick={() => handleRevoke(id, 1)}
                                type="button"
                                disabled={saving}
                                className="w-7 h-7 flex items-center justify-center bg-white border border-slate-200 text-slate-500 rounded-lg hover:bg-slate-100 disabled:opacity-50 transition-colors"
                                title="1개 차감"
                              >
                                <Minus size={14} strokeWidth={2.5} />
                              </button>
                              <button 
                                onClick={() => handleDeleteAll(id)}
                                type="button"
                                disabled={saving}
                                className="w-7 h-7 flex items-center justify-center bg-white border border-red-200 text-red-500 rounded-lg hover:bg-red-50 disabled:opacity-50 transition-colors"
                                title="전체 삭제"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* 강제 지급 폼 */}
                  <div className="border-t border-slate-100 pt-4">
                    {/* 🚨 교정: 라벨과 필터 블록을 flex justify-between으로 묶어 우측 정렬하고 한 줄로 압축 */}
                    <div className="flex items-center justify-between mb-3">
                      <label className="text-xs font-bold text-slate-500 block">신규 아이템 지급</label>
                      
                      <div className="flex items-center gap-1.5">
                        {/* 획득처 필터 */}
                        <div className="flex items-center gap-1 bg-slate-100 rounded-md p-1">
                          <Filter size={10} className="text-slate-400 ml-1 shrink-0" />
                          <select 
                            value={obtainFilter} 
                            onChange={(e) => {
                              setObtainFilter(e.target.value);
                              setSelectedItemId('');
                            }}
                            className="bg-transparent text-[11px] font-medium text-slate-600 focus:outline-none pr-1 cursor-pointer"
                          >
                            <option value="all">획득처 전체</option>
                            <option value="shop">상점 (shop)</option>
                            <option value="gacha">가챠 (gacha)</option>
                            <option value="event">이벤트 (event)</option>
                            <option value="combine">합성 (combine)</option>
                          </select>
                        </div>
                        {/* 등급 필터 */}
                        <div className="flex items-center gap-1 bg-slate-100 rounded-md p-1">
                          <Filter size={10} className="text-slate-400 ml-1 shrink-0" />
                          <select 
                            value={gradeFilter} 
                            onChange={(e) => {
                              setGradeFilter(e.target.value);
                              setSelectedItemId('');
                            }}
                            className="bg-transparent text-[11px] font-medium text-slate-600 focus:outline-none pr-1 cursor-pointer"
                          >
                            <option value="all">등급 전체</option>
                            <option value="common">Common</option>
                            <option value="rare">Rare</option>
                            <option value="epic">Epic</option>
                            <option value="legendary">Legendary</option>
                            <option value="special">Special</option>
                            <option value="passive">Passive</option>
                            <option value="fail">Fail</option>
                            <option value="combine">Combine</option>
                          </select>
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <select
                        value={selectedItemId}
                        onChange={(e) => setSelectedItemId(e.target.value)}
                        className="flex-1 px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-slate-400 bg-white"
                      >
                        <option value="">아이템 선택...</option>
                        {filteredAssets.map(asset => (
                          <option key={asset.id} value={asset.id}>
                            {asset.icon} {asset.name}
                          </option>
                        ))}
                      </select>
                      <input 
                        type="number" 
                        min="1"
                        value={qty}
                        onChange={(e) => setQty(Number(e.target.value))}
                        className="w-16 px-2 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-slate-400 text-center bg-white shrink-0"
                      />
                      <Button variant="primary" type="button" loading={saving} onClick={handleGrant}>
                        <Plus size={14} /> 지급
                      </Button>
                    </div>
                  </div>

                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}