import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const LESSON_QUOTES = [
  "\"예술가는 평범한 것을 가져다 특별하게 만드는 사람이다. 당신은 이미 예술가다.\" – 에런 코플랜드",
  "\"매일 소리를 만지는 사람은 결국 자신도 모르는 사이에 거대한 산을 움직이게 된다.\" – 조지 거슈윈",
  "\"음악은 마음속에 있는 생각의 파편들을 하나의 아름다운 우주로 엮어내는 힘이다.\" – 요한 세바스티안 바흐",
  "\"모든 위대한 음악도 결국 단 하나의 음을 누르는 작은 용기에서 시작되었다.\" – 이고르 스트라빈스키",
  "\"예술이란 영혼에서 일상의 먼지를 씻어내는 일이다. 당신은 매일 영혼을 씻어내고 있다.\" – 파블로 피카소",
  "\"당신의 소리가 완벽할 필요는 없다. 오직 당신만이 낼 수 있는 소리라면 그것으로 가치 있다.\" – 마일스 데이비스",
  "\"음악은 인류의 공통어이며, 당신의 소리는 누군가에게 거대한 위로가 된다.\" – 롱펠로우",
  "\"음악을 하는 동안 당신은 당신만의 세계를 창조하는 세상의 유일한 지배자다.\" – 루트비히 판 베토벤",
  "\"세상이 내 음악을 알아주지 않는다면, 그건 세상의 귀가 아직 덜 열린 탓이다.\" – 루트비히 판 베토벤",
  "\"매일 악기 앞에 앉아 무언가를 만들어내는 당신은 이미 지구상에서 가장 멋진 존재다.\" – 아르투르 루빈스타인",
  "\"위대한 예술은 언제나 무모한 시도에서 시작된다. 기죽지 말고 네 소리를 내라.\" – 오스카 와일드",
  "\"내 음악이 너무 앞서갔다면, 세상이 뒤늦게 뛰어와서 따라잡아야 할 것이다.\" – 스트라빈스키",
  "\"세상에 음악이 있다는 것, 그리고 당신이 그걸 만들어낼 수 있다는 것은 기적과도 같다.\" – 퀸시 존스",
  "\"재능이란 별게 아니다. 오늘 내 음악을 사랑하고 한 번 더 소리를 만져보는 것, 그게 전부다.\" – 요한 슈트라우스",
  "\"당신이 악기 앞에 앉는 순간, 이미 당신은 세상에서 가장 특별한 이야기를 시작한 것이다.\" – 한스 짐머",
  "\"내 음악은 단순한 소리가 아니다. 세상을 향해 뱉는 가장 멋진 독백이다.\" – 프레디 머큐리",
  "\"진정한 거장은 완벽한 음을 치는 사람이 아니라, 음악을 가장 즐겁게 누리는 사람이다.\" – 루치아노 파바로티",
  "\"인생은 하나의 거대한 캔버스다. 당신의 소리로 오늘을 가장 화려하게 물들여라.\" – 대니 케이",
  "\"음악이 우리를 구원하진 못해도, 오늘 하루를 세상에서 가장 근사하게 만들 순 있다.\" – 레너드 번스타인",
  "\"내 음악이 끝내주냐고? 당연하지. 내가 온 영혼을 갈아 넣어서 만들었으니까.\" – 지미 헨드릭스",
  "\"오늘 작업실 문을 열고 들어오는 당신이 오늘의 거장입니다.\" - 재인",
  "\"당신은 생각보다 음악에 소질이 있습니다.\" - 재인",
  "\"틀린 음은 없습니다. 아직 다음 음으로 수습하지 않았을 뿐...\" - 재인",
  "편하게 오시면 됩니다 :)",
];

async function postWebhook(
  url: string,
  title: string,
  description: string,
  color: number
): Promise<void> {
  await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      embeds: [{ title, description, color, timestamp: new Date().toISOString() }],
    }),
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const today = new Date().toISOString().slice(0, 10);
    const in7Days = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10);

    let lessonCount = 0;
    let expiryCount = 0;

    // lesson_today: confirmed reservations for today
    const { data: todayReservations } = await supabase
      .from("reservations")
      .select("user_id, profiles(discord_webhook), time_slots(slot_date, start_time, end_time)")
      .eq("status", "confirmed")
      .eq("time_slots.slot_date", today);

    for (const r of todayReservations || []) {
      const webhookUrl = (r as any).profiles?.discord_webhook as string | null;
      const slot = (r as any).time_slots as any;
      if (!webhookUrl || !slot) continue;
      const quote = LESSON_QUOTES[Math.floor(Math.random() * LESSON_QUOTES.length)];
      try {
        await postWebhook(
          webhookUrl,
          "🎵 오늘 레슨 안내",
          `오늘 예정된 레슨은 🕒 ${slot.start_time?.slice(0, 5)} 입니다.\n\n${quote}`,
          0x5865f2
        );
        lessonCount++;
      } catch { /* best-effort */ }
    }

    // expiry_warning: active students with expiry_date within 7 days
    const { data: expiringStudents } = await supabase
      .from("profiles")
      .select("id, discord_webhook, expiry_date")
      .eq("role", "student")
      .eq("status", "active")
      .gte("expiry_date", today)
      .lte("expiry_date", in7Days)
      .not("discord_webhook", "is", null);

    for (const s of expiringStudents || []) {
      if (!s.discord_webhook || !s.expiry_date) continue;
      const daysLeft = Math.floor(
        (new Date(s.expiry_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      );
      try {
        await postWebhook(
          s.discord_webhook,
          "⏰ 수강기간 만료 임박",
          `수강기간이 **${daysLeft}일** 남았습니다.\n**만료일:** ${new Date(s.expiry_date).toLocaleDateString("ko-KR")}`,
          0xfee75c
        );
        expiryCount++;
      } catch { /* best-effort */ }
    }

    return new Response(
      JSON.stringify({ success: true, lesson_today: lessonCount, expiry_warning: expiryCount }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
