import React, { useState, useEffect } from 'react';
import { Trophy, Medal, Crown, RefreshCw } from 'lucide-react';
import { supabase, type Profile } from '../../lib/supabase';

interface RankingBoardProps {
  profile: Profile;
}

interface RankEntry {
  id: string;
  full_name: string;
  points: number;
  rank: number;
}

function daysLeftInMonth(): number {
  const now = new Date();
  const last = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return last.getDate() - now.getDate();
}

function getRankIcon(rank: number) {
  if (rank === 1) return <Crown size={15} className="text-amber-400" />;
  if (rank === 2) return <Medal size={15} className="text-slate-400" />;
  if (rank === 3) return <Medal size={15} className="text-amber-600" />;
  return <span className="text-xs text-[#475569] font-medium w-4 text-center leading-none">{rank}</span>;
}

export function RankingBoard({ profile }: RankingBoardProps) {
  const [rankings, setRankings] = useState<RankEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const dLeft = daysLeftInMonth();

  async function load() {
    setLoading(true);
    const { data } = await supabase
      .from('profiles')
      .select('id, full_name, points')
      .eq('role', 'student')
      .eq('status', 'active')
      .order('points', { ascending: false });
    setRankings((data || []).map((p, i) => ({ ...p, rank: i + 1 })));
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  const myRank = rankings.find(r => r.id === profile.id);

  return (
    <div className="bg-[#141b2d] border border-[#1e2940] rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-[#1e2940] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Trophy size={16} className="text-amber-400" />
          <h3 className="font-semibold text-white text-sm">실시간 랭킹</h3>
          {myRank && (
            <span className="ml-1 text-xs text-[#94a3b8]">
              · 내 순위 <span className="text-[#22d3ee] font-semibold">{myRank.rank}위</span>
              <span className="mx-1 text-[#334155]">·</span>
              <span className="text-[#a855f7] font-semibold">{myRank.points}점</span>
            </span>
          )}
        </div>
        <div className="flex items-center gap-2.5">
          <span className="text-xs font-semibold text-[#475569] bg-[#0b0f19] border border-[#1e2940] px-2.5 py-1 rounded-full">
            D-{dLeft}
          </span>
          <button
            onClick={load}
            className="p-1.5 hover:bg-[#1e2940] rounded-lg transition-colors"
            aria-label="새로고침"
          >
            <RefreshCw size={14} className={`text-[#475569] ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Body */}
      {loading ? (
        <div className="flex items-center justify-center py-10 text-[#475569] text-sm gap-2">
          <RefreshCw size={16} className="animate-spin" />
          불러오는 중...
        </div>
      ) : rankings.length === 0 ? (
        <div className="text-center py-10 text-[#334155] text-sm">아직 랭킹 데이터가 없습니다.</div>
      ) : (
        <div className="divide-y divide-[#1a2236]">
          {rankings.map((entry, idx) => {
            const isMe = entry.id === profile.id;
            return (
              <div
                key={`${entry.id}-${idx}`}
                className={`flex items-center justify-between px-5 py-3 transition-colors
                  ${isMe ? 'bg-[#22d3ee]/[0.06] border-l-2 border-l-[#22d3ee]' : 'hover:bg-[#1a2236]'}`}
              >
                <div className="flex items-center gap-3.5">
                  <div className="w-5 flex items-center justify-center flex-shrink-0">
                    {getRankIcon(entry.rank)}
                  </div>
                  <span className={`font-medium text-sm ${isMe ? 'text-[#22d3ee]' : 'text-white'}`}>
                    {entry.full_name}
                  </span>
                  {isMe && <span className="text-[10px] text-[#22d3ee]/60 font-semibold tracking-wide">ME</span>}
                </div>
                <div className="flex items-baseline gap-0.5">
                  <span className={`text-base font-bold ${isMe ? 'text-[#a855f7]' : 'text-[#94a3b8]'}`}>
                    {entry.points}
                  </span>
                  <span className="text-xs text-[#475569]">점</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
