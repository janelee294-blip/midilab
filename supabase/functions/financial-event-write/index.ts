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

  // ── Validate session token from Authorization header (not from body) ───────
  const valid = await validateAdminToken(serviceClient, req);
  if (!valid) return json({ error: "인증이 필요합니다." }, 401);

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }

  const { action, ...payload } = body as { action: string; [k: string]: unknown };

  // ── INSERT: new financial event (cost / revenue) ───────────────────────────
  if (action === "insert") {
    const { type, amount, source, note, student_id } = payload as {
      type: string; amount: number; source: string; note?: string; student_id?: string;
    };

    const record: Record<string, unknown> = { type, amount, source };
    if (note)       record.note       = note;
    if (student_id) record.student_id = student_id;

    const { data, error } = await serviceClient
      .from("financial_events")
      .insert(record)
      .select()
      .single();

    if (error) return json({ error: error.message }, 500);
    return json({ data });
  }

  // ── CANCEL: soft-delete (is_cancelled = true, data preserved) ─────────────
  if (action === "cancel") {
    const { event_id } = payload as { event_id: string };
    if (!event_id) return json({ error: "event_id required" }, 400);

    const { error } = await serviceClient
      .from("financial_events")
      .update({ is_cancelled: true })
      .eq("id", event_id)
      .eq("is_cancelled", false); // idempotency guard

    if (error) return json({ error: error.message }, 500);
    return json({ ok: true });
  }

  return json({ error: "Unknown action" }, 400);
});
