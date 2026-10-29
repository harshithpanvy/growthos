import { NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/rate-limit";
import { createUserServerClient, getServerAuthContext, isServerSupabaseConfigured } from "@/lib/supabase-server";
import { normalizeReferralCode } from "@/lib/validation";

const VALID_EVENT_TYPES = new Set([
  "landing_view",
  "registration_started",
  "registration_completed",
  "referral_shared"
]);

export async function POST(request: Request) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  const rate = checkRateLimit({ key: `attribution:${ip}`, limit: 40, windowMs: 60_000 });
  if (!rate.allowed) {
    return NextResponse.json(
      { error: "Too many requests. Please slow down." },
      { status: 429, headers: { "Retry-After": String(rate.retryAfterSeconds) } }
    );
  }

  try {
    const body = (await request.json()) as Record<string, unknown>;
    const eventType = typeof body.event_type === "string" ? body.event_type : "landing_view";
    if (!VALID_EVENT_TYPES.has(eventType)) {
      return NextResponse.json({ error: "Invalid attribution event type." }, { status: 400 });
    }

    if (!isServerSupabaseConfigured) {
      return NextResponse.json({
        recorded: false,
        reason: "supabase_not_configured"
      });
    }

    const authContext = await getServerAuthContext(request);
    const client = authContext.client ?? createUserServerClient(null);
    if (!client) {
      return NextResponse.json({ recorded: false, reason: "client_unavailable" });
    }

    const utmSource = typeof body.utm_source === "string" ? body.utm_source.trim().slice(0, 80) || null : null;
    const utmMedium = typeof body.utm_medium === "string" ? body.utm_medium.trim().slice(0, 80) || null : null;
    const utmCampaign = typeof body.utm_campaign === "string" ? body.utm_campaign.trim().slice(0, 80) || null : null;
    const landingPage = typeof body.landing_page === "string" ? body.landing_page.trim().slice(0, 160) || null : null;
    const referralCode = normalizeReferralCode(typeof body.referral_code === "string" ? body.referral_code : null);

    const { error } = await client.from("attribution_events").insert({
      event_type: eventType,
      user_id: authContext.user?.id ?? null,
      utm_source: utmSource,
      utm_medium: utmMedium,
      utm_campaign: utmCampaign,
      landing_page: landingPage,
      referral_code: referralCode
    });

    if (error) {
      return NextResponse.json({ recorded: false, error: error.message }, { status: 200 });
    }

    return NextResponse.json({ recorded: true });
  } catch {
    return NextResponse.json({ error: "Malformed request payload." }, { status: 400 });
  }
}

