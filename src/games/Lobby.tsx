import React from 'react';
import { Star } from 'lucide-react';
import { GameMeta } from './types';
import { useGameStatus } from '../lib/useGameStatus';

interface Props {
  games: GameMeta[];
  onSelectGame: (id: string) => void;
}

export function GameLobby({ games, onSelectGame }: Props) {
  const { hasAvailable } = useGameStatus();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-white">챌린지 로비</h2>
        <p className="text-sm text-[#94a3b8] mt-1">챌린지 성공 시 포인트를 획득할 수 있습니다.</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {games.map((game) => {
          const Icon = game.icon;
          const isSoon = game.badge === 'soon';
          const available = !isSoon && hasAvailable(game.id);
          return (
            <button
              key={game.id}
              onClick={() => !isSoon && onSelectGame(game.id)}
              disabled={isSoon}
              className={`
                relative group text-left rounded-2xl border p-5 transition-all duration-200
                ${isSoon
                  ? 'bg-[#0d1221] border-[#1e2940] opacity-50 cursor-not-allowed'
                  : 'bg-[#141b2d] border-[#1e2940] hover:border-[#22d3ee]/50 hover:bg-[#192035] hover:shadow-[0_0_20px_rgba(34,211,238,0.08)] cursor-pointer active:scale-[0.98]'}
              `}
            >
              {/* 포인트 획득 가능 표시 */}
              {available && (
                <span className="absolute top-2.5 right-2.5 flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-emerald-500/15 border border-emerald-500/30 text-emerald-400">
                  <span className="w-1 h-1 rounded-full bg-emerald-400 animate-pulse inline-block" />
                  획득 가능
                </span>
              )}

              {/* badge: new/soon (포인트 가능 표시가 없을 때만) */}
              {game.badge && !available && (
                <span
                  className={`absolute top-3 right-3 text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                    game.badge === 'new'
                      ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400'
                      : 'bg-[#1e2940] border-[#273352] text-[#475569]'
                  }`}
                >
                  {game.badge === 'new' ? 'NEW' : 'SOON'}
                </span>
              )}

              <div className={`w-11 h-11 rounded-xl flex items-center justify-center mb-4 transition-colors ${
                isSoon ? 'bg-[#1e2940]' : 'bg-[#22d3ee]/10 group-hover:bg-[#22d3ee]/20'
              }`}>
                <Icon size={22} className={isSoon ? 'text-[#334155]' : 'text-[#22d3ee]'} />
              </div>

              <p className="font-semibold text-white text-sm leading-tight">{game.title}</p>
              <p className="text-[11px] text-[#94a3b8] mt-1 leading-snug">{game.description}</p>
              {game.pointRule && (
                <div className="mt-2 flex items-start gap-1">
                  <Star size={9} className="text-amber-400 mt-0.5 shrink-0" />
                  <p className="text-[10px] text-amber-400/80 leading-snug">{game.pointRule}</p>
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
