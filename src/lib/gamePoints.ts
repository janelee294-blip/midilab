// All point awarding runs through the server-side Edge Function.
// The browser never writes directly to game_point_logs or calls adjust_user_points.

const SESSION_KEY = 'midilab_session';

function getStoredUserId(): string | null {
  try {
    const stored = localStorage.getItem(SESSION_KEY);
    if (!stored) return null;
    const profile = JSON.parse(stored);
    return profile?.id ?? null;
  } catch { return null; }
}

function getWeekKey(): string {
  const d = new Date();
  const dow = d.getUTCDay();
  const monday = new Date(d);
  monday.setUTCDate(d.getUTCDate() - (dow === 0 ? 6 : dow - 1));
  monday.setUTCHours(0, 0, 0, 0);
  return monday.toISOString().slice(0, 10);
}

function getTodayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

async function callAwardFunction(
  gameId: string,
  subKey: string,
  metadata: Record<string, unknown> = {}
): Promise<number> {
  const userId = getStoredUserId();
  if (!userId) return 0;

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

  try {
    const res = await fetch(`${supabaseUrl}/functions/v1/award-game-points`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseAnonKey}`,
        'apikey': supabaseAnonKey,
      },
      body: JSON.stringify({ userId, gameId, subKey, metadata }),
    });
    if (!res.ok) return 0;
    const data = await res.json();
    return typeof data.points === 'number' ? data.points : 0;
  } catch {
    return 0;
  }
}

// Quiz: 각 회차 최초 1회 통과 시 1점
export function awardQuizPoints(weekNum: number): Promise<number> {
  return callAwardFunction('quiz', `week_${weekNum}`);
}

// 금고열기: 이지 1점(일 1회), 하드 3점(일 1회)
export function awardEarTrainingPoints(mode: 'easy' | 'hard'): Promise<number> {
  return callAwardFunction('ear-training', `${mode}:${getTodayKey()}`);
}

// 단축키: 점수 구간별 1~3점 (주 1회) — 점수 검증은 서버에서
export function awardShortCutPoints(finalScore: number): Promise<number> {
  return callAwardFunction('short-cut', `score:${getWeekKey()}`, { score: finalScore });
}

// 베이스: 이지 1점, 하드 3점 (각 최초 1회)
export function awardBassPoints(difficulty: 'easy' | 'hard'): Promise<number> {
  return callAwardFunction('bass-game', difficulty);
}

// 피아노: 레벨 0-2 최초1회 1점, 3-6 주1회 1점(일 최대 2점), 7-9 주1회 2점(일 최대 4점)
export function awardPianoPoints(levelKey: string): Promise<number> {
  const levelNum = parseInt(levelKey.split('-')[0]);
  let subKey: string;
  if (levelNum <= 2) {
    subKey = `lv:${levelKey}`;
  } else if (levelNum <= 6) {
    subKey = `3-6:${levelKey}:${getWeekKey()}`;
  } else {
    subKey = `7-9:${levelKey}:${getWeekKey()}`;
  }
  return callAwardFunction('piano-game', subKey);
}

// 드럼: 튜토/초급 1점(최초), 중급 2점(주1회), 심화·마스터 3점(주1회)
export function awardDrumPoints(diff: string, themeKey: string): Promise<number> {
  const needsWeek = diff !== 'tutorial' && diff !== 'easy';
  const subKey = needsWeek ? `${diff}:${themeKey}:${getWeekKey()}` : `${diff}:${themeKey}`;
  return callAwardFunction('drum-game', subKey);
}
