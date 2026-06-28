import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

// Service role client — bypasses RLS, never exposed to browser
const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

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

async function hasLogEntry(userId: string, gameId: string, subKey: string): Promise<boolean> {
  const { count } = await supabase
    .from("game_point_logs")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("game_id", gameId)
    .eq("sub_key", subKey);
  return (count ?? 0) > 0;
}

async function getDailyPointsForGroup(userId: string, gameId: string, prefix: string): Promise<number> {
  const today = getTodayKey();
  const { data } = await supabase
    .from("game_point_logs")
    .select("points")
    .eq("user_id", userId)
    .eq("game_id", gameId)
    .like("sub_key", `${prefix}%`)
    .gte("awarded_at", `${today}T00:00:00.000Z`)
    .lt("awarded_at", `${today}T23:59:59.999Z`);
  return (data ?? []).reduce((s: number, r: { points: number }) => s + r.points, 0);
}

async function doAward(userId: string, gameId: string, subKey: string, points: number): Promise<void> {
  await supabase.from("game_point_logs").insert({ user_id: userId, game_id: gameId, sub_key: subKey, points });
  await supabase.rpc("adjust_user_points", {
    p_user_id: userId,
    p_delta: points,
    p_reason: `게임 포인트 (${gameId})`,
  });
}

async function resolvePoints(
  userId: string,
  gameId: string,
  subKey: string,
  meta: Record<string, unknown>
): Promise<number> {
  const today = getTodayKey();
  const week = getWeekKey();

  if (gameId === "quiz") {
    // week_1 ~ week_4 only, 1pt, once ever
    if (!/^week_[1-4]$/.test(subKey)) return 0;
    if (await hasLogEntry(userId, gameId, subKey)) return 0;
    await doAward(userId, gameId, subKey, 1);
    return 1;
  }

  if (gameId === "ear-training") {
    // easy:YYYY-MM-DD or hard:YYYY-MM-DD (today only), 1 or 3pt, daily 1
    const validSubKey = subKey === `easy:${today}` || subKey === `hard:${today}`;
    if (!validSubKey) return 0;
    if (await hasLogEntry(userId, gameId, subKey)) return 0;
    const pts = subKey.startsWith("hard") ? 3 : 1;
    await doAward(userId, gameId, subKey, pts);
    return pts;
  }

  if (gameId === "short-cut") {
    // score:YYYY-MM-DD (week monday), weekly 1, 1~3pt by score
    if (subKey !== `score:${week}`) return 0;
    const score = typeof meta.score === "number" ? meta.score : 0;
    let pts = 0;
    if (score >= 16000) pts = 3;
    else if (score >= 12000) pts = 2;
    else if (score >= 8000) pts = 1;
    if (pts === 0) return 0;
    if (await hasLogEntry(userId, gameId, subKey)) return 0;
    await doAward(userId, gameId, subKey, pts);
    return pts;
  }

  if (gameId === "bass-game") {
    // easy | hard, once ever
    if (subKey !== "easy" && subKey !== "hard") return 0;
    if (await hasLogEntry(userId, gameId, subKey)) return 0;
    const pts = subKey === "hard" ? 3 : 1;
    await doAward(userId, gameId, subKey, pts);
    return pts;
  }

  if (gameId === "piano-game") {
    if (subKey.startsWith("lv:")) {
      // lv:X-Y, levelNum 0-2, once ever
      const lvKey = subKey.slice(3);
      const lvNum = parseInt(lvKey.split("-")[0]);
      if (isNaN(lvNum) || lvNum > 2) return 0;
      if (await hasLogEntry(userId, gameId, subKey)) return 0;
      await doAward(userId, gameId, subKey, 1);
      return 1;
    }
    if (subKey.startsWith("3-6:")) {
      // 3-6:X-Y:weekKey, weekly per sub-level, 0.5pt each, daily max 1pt
      if (!subKey.endsWith(`:${week}`)) return 0;
      const daily = await getDailyPointsForGroup(userId, gameId, "3-6:");
      if (daily >= 1) return 0;
      if (await hasLogEntry(userId, gameId, subKey)) return 0;
      await doAward(userId, gameId, subKey, 0.5);
      return 0.5;
    }
    if (subKey.startsWith("7-9:")) {
      // 7-9:X-Y:weekKey, weekly per sub-level, 1pt each, daily max 1pt
      if (!subKey.endsWith(`:${week}`)) return 0;
      const daily = await getDailyPointsForGroup(userId, gameId, "7-9:");
      if (daily >= 1) return 0;
      if (await hasLogEntry(userId, gameId, subKey)) return 0;
      await doAward(userId, gameId, subKey, 1);
      return 1;
    }
    return 0;
  }

  if (gameId === "drum-game") {
    const diff = subKey.split(":")[0];
    const validDiffs = ["tutorial", "easy", "normal", "hard", "master"];
    if (!validDiffs.includes(diff)) return 0;
    if (diff === "tutorial" || diff === "easy") {
      if (await hasLogEntry(userId, gameId, subKey)) return 0;
      await doAward(userId, gameId, subKey, 1);
      return 1;
    }
    // normal/hard/master require subKey to end with current weekKey
    if (!subKey.endsWith(`:${week}`)) return 0;
    if (await hasLogEntry(userId, gameId, subKey)) return 0;
    const pts = diff === "normal" ? 2 : 3;
    await doAward(userId, gameId, subKey, pts);
    return pts;
  }

  return 0;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 200, headers: corsHeaders });

  try {
    const { userId, gameId, subKey, metadata = {} } = await req.json();

    if (!userId || !gameId || !subKey) {
      return new Response(JSON.stringify({ error: "Missing fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify the user exists and is active — prevents awarding to deleted/suspended accounts
    const { data: profile } = await supabase
      .from("profiles")
      .select("id")
      .eq("id", userId)
      .eq("status", "active")
      .maybeSingle();

    if (!profile) {
      return new Response(JSON.stringify({ error: "User not eligible" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const points = await resolvePoints(userId, gameId, subKey, metadata as Record<string, unknown>);

    return new Response(JSON.stringify({ points }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch {
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
