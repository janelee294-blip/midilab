import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Get all active students with points > 0
    const { data: students, error: stuErr } = await supabase
      .from("profiles")
      .select("id, full_name, points")
      .eq("role", "student")
      .gt("points", 0);

    if (stuErr) throw stuErr;

    const snapshotMonth = new Date().toISOString().slice(0, 7);

    // Backup rankings
    if (students && students.length > 0) {
      const sorted = students.sort((a, b) => b.points - a.points);
      const backups = sorted.map((s, i) => ({
        user_id: s.id,
        full_name: s.full_name,
        points: s.points,
        rank_position: i + 1,
        snapshot_month: snapshotMonth,
      }));

      await supabase.from("ranking_backup").insert(backups);

      // Reset all student points to 0
      await supabase
        .from("profiles")
        .update({ points: 0 })
        .eq("role", "student");

      // Log the reset in points_history for each student
      const historyEntries = students.map((s) => ({
        user_id: s.id,
        delta: -s.points,
        reason: "월간 자동 초기화",
      }));
      await supabase.from("points_history").insert(historyEntries);
    }

    return new Response(
      JSON.stringify({ success: true, reset_count: students?.length || 0, month: snapshotMonth }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
