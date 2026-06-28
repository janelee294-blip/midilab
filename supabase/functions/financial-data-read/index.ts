import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function validateAdminToken(
  serviceClient: ReturnType<typeof createClient>,
  req: Request,
): Promise<boolean> {
  const h = req.headers.get("Authorization") ?? "";
  if (!h.startsWith("Bearer ")) return false;
  const token = h.slice(7).trim();
  if (!token) return false;

  const { data } = await serviceClient
    .from("admin_sessions")
    .select("expires_at")
    .eq("token", token)
    .maybeSingle();

  if (!data) return false;
  return new Date(data.expires_at as string) > new Date();
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 200, headers: corsHeaders });

  const serviceClient = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  // ── Validate session token from Authorization header ───────────────────────
  const valid = await validateAdminToken(serviceClient, req);
  if (!valid) return json({ error: "인증이 필요합니다." }, 401);

  // ── Fetch financial events (all, including cancelled — client filters) ─────
  const { data: events, error: evErr } = await serviceClient
    .from("financial_events")
    .select("id, student_id, type, amount, apply_month, source, note, created_at, is_cancelled")
    .order("created_at");

  if (evErr) return json({ error: evErr.message }, 500);

  // ── Fetch BI config + Capacity config from admin_settings ────────────────
  const [{ data: biRow }, { data: capRow }] = await Promise.all([
    serviceClient.from("admin_settings").select("value").eq("key", "bi_config").maybeSingle(),
    serviceClient.from("admin_settings").select("value").eq("key", "capacity_config").maybeSingle(),
  ]);

  return json({
    events: events ?? [],
    biConfig: biRow?.value ?? null,
    capacityConfig: capRow?.value ?? null,
  });
});
