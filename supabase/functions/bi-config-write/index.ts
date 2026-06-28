import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
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

  const valid = await validateAdminToken(serviceClient, req);
  if (!valid) return json({ error: "인증이 필요합니다." }, 401);

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }

  // ── Save Capacity config ───────────────────────────────────────────────────
  if (body.action === "capacity") {
    const { sessionTime, desiredHours, maxHours } = body as {
      sessionTime: number | null;
      desiredHours: number | null;
      maxHours: number | null;
    };
    const { error } = await serviceClient.from("admin_settings").upsert({
      key: "capacity_config",
      value: { sessionTime, desiredHours, maxHours },
      updated_at: new Date().toISOString(),
    });
    if (error) return json({ error: error.message }, 500);
    return json({ ok: true });
  }

  // ── Save BEP config (default action) ──────────────────────────────────────
  const { fixedCost, targetRevenue } = body as { fixedCost: string; targetRevenue: string };
  const { error } = await serviceClient.from("admin_settings").upsert({
    key: "bi_config",
    value: { fixedCost, targetRevenue },
    updated_at: new Date().toISOString(),
  });
  if (error) return json({ error: error.message }, 500);
  return json({ ok: true });
});
