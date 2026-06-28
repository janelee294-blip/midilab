import { useState, useEffect, useCallback } from 'react';
import { supabase } from './supabase';

const SESSION_KEY = 'midilab_session';

function getStoredUserId(): string | null {
  try {
    const s = localStorage.getItem(SESSION_KEY);
    return s ? JSON.parse(s)?.id ?? null : null;
  } catch { return null; }
}

export function getWeekKey(): string {
  const d = new Date();
  const dow = d.getUTCDay();
  const monday = new Date(d);
  monday.setUTCDate(d.getUTCDate() - (dow === 0 ? 6 : dow - 1));
  monday.setUTCHours(0, 0, 0, 0);
  return monday.toISOString().slice(0, 10);
}

export function getTodayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

export function fmtCountdownDaily(): string {
  const now = new Date();
  const midnight = new Date(now);
  midnight.setUTCDate(now.getUTCDate() + 1);
  midnight.setUTCHours(0, 0, 0, 0);
  const diff = Math.max(0, Math.floor((midnight.getTime() - now.getTime()) / 1000));
  const h = Math.floor(diff / 3600);
  const m = Math.floor((diff % 3600) / 60);
  if (h > 0) return `${h}시간 ${m}분 후 초기화`;
  return `${m}분 후 초기화`;
}

export function fmtCountdownWeekly(): string {
  const now = new Date();
  const dow = now.getUTCDay();
  const daysUntilMonday = dow === 0 ? 1 : 8 - dow;
  const nextMonday = new Date(now);
  nextMonday.setUTCDate(now.getUTCDate() + daysUntilMonday);
  nextMonday.setUTCHours(0, 0, 0, 0);
  const diff = Math.max(0, Math.floor((nextMonday.getTime() - now.getTime()) / 1000));
  const days = Math.floor(diff / 86400);
  const h = Math.floor((diff % 86400) / 3600);
  const m = Math.floor((diff % 3600) / 60);
  if (days > 0) return `${days}일 ${h}시간 후 초기화`;
  if (h > 0) return `${h}시간 ${m}분 후 초기화`;
  return `${m}분 후 초기화`;
}

export interface GameLog {
  game_id: string;
  sub_key: string;
  points: number;
  awarded_at: string;
}

export function useGameStatus() {
  const [logs, setLogs] = useState<GameLog[]>([]);

  const fetchLogs = useCallback(() => {
    const userId = getStoredUserId();
    if (!userId) return;
    supabase
      .from('game_point_logs')
      .select('game_id, sub_key, points, awarded_at')
      .eq('user_id', userId)
      .then(({ data }) => setLogs((data as GameLog[]) ?? []));
  }, []);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  function isEarned(gameId: string, subKey: string): boolean {
    return logs.some(l => l.game_id === gameId && l.sub_key === subKey);
  }

  // Sum of points earned today (UTC) for a given game_id + sub_key prefix
  function getDailyPts(gameId: string, prefix: string): number {
    const today = getTodayKey();
    return logs
      .filter(l =>
        l.game_id === gameId &&
        l.sub_key.startsWith(prefix) &&
        l.awarded_at.slice(0, 10) === today
      )
      .reduce((s, l) => s + l.points, 0);
  }

  function hasAvailable(gameId: string): boolean {
    const week = getWeekKey();
    const today = getTodayKey();
    if (gameId === 'ear-training') {
      return !isEarned('ear-training', `easy:${today}`) || !isEarned('ear-training', `hard:${today}`);
    }
    if (gameId === 'bass-game') {
      return !isEarned('bass-game', 'easy') || !isEarned('bass-game', 'hard');
    }
    if (gameId === 'quiz') {
      return [1, 2, 3, 4].some(w => !isEarned('quiz', `week_${w}`));
    }
    if (gameId === 'short-cut') {
      return !isEarned('short-cut', `score:${week}`);
    }
    // drum-game, piano-game: too many sub-keys — assume available
    return true;
  }

  return { logs, isEarned, getDailyPts, hasAvailable, refresh: fetchLogs };
}
