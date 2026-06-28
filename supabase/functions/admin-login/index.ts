import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { SignJWT } from "npm:jose@5";

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

function generateToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

function extractBearerToken(req: Request): string {
  const h = req.headers.get("Authorization") ?? "";
  return h.startsWith("Bearer ") ? h.slice(7).trim() : "";
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 200, headers: corsHeaders });

  try {
    const jwtSecret = Deno.env.get("CUSTOM_JWT_SECRET");
    if (!jwtSecret) {
      console.error("SUPABASE_JWT_SECRET is not set");
      return json({ error: "서버 설정 오류: JWT 시크릿을 읽을 수 없습니다." }, 500);
    }

    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      return json({ error: "Invalid JSON" }, 400);
    }

    // ── LOGOUT ────────────────────────────────────────────────────────────────
    if (body.action === "logout") {
      const token = extractBearerToken(req);
      if (token) {
        await serviceClient.from("admin_sessions").delete().eq("token", token);
      }
      return json({ ok: true });
    }

    // ── LOGIN ─────────────────────────────────────────────────────────────────
    const phone = String(body.phone ?? "").trim();
    const password = String(body.password ?? "").trim();

    if (!password) return json({ error: "비밀번호를 입력해주세요." }, 400);

    let profile: Record<string, unknown> | null = null;

    if (!phone) {
      const { data } = await serviceClient.rpc("login_admin_bypass", { p_password: password });
      profile = data as typeof profile;
    } else {
      const { data } = await serviceClient.rpc("login_by_phone", {
        p_phone: phone.replace(/[\s\-]/g, ""),
        p_password: password,
      });
      profile = data as typeof profile;
    }

    if (!profile) {
      const errorMsg = !phone
        ? "관리자 비밀번호가 올바르지 않습니다."
        : "전화번호 또는 비밀번호가 올바르지 않습니다.";
      return json({ error: errorMsg }, 401);
    }

    // ── Sign JWT with jose (HS256) ────────────────────────────────────────────
    const secret = new TextEncoder().encode(jwtSecret);
    const accessToken = await new SignJWT({
      role: "authenticated",
      app_role: profile.role,  // 'admin' | 'student'
    })
      .setProtectedHeader({ alg: "HS256", typ: "JWT" })
      .setIssuer("supabase")
      .setSubject(String(profile.id))
      .setAudience("authenticated")
      .setIssuedAt()
      .setExpirationTime("24h")
      .sign(secret);

    // ── Admin session token (for Edge Function authorization) ─────────────────
    let sessionToken: string | null = null;
    if (profile.role === "admin") {
      sessionToken = generateToken();
      await serviceClient.from("admin_sessions").insert({
        profile_id: profile.id,
        token: sessionToken,
        expires_at: new Date(Date.now() + 86400_000).toISOString(),
      });
    }

    return json({ profile, accessToken, sessionToken });

  } catch (err) {
    console.error("admin-login unhandled error:", err);
    return json({ error: "서버 내부 오류가 발생했습니다." }, 500);
  }
});
