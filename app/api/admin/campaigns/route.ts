import { NextResponse } from "next/server";
import { recordAdminAuditLog, requireAdminAuth } from "@/lib/supabase-server";
import { validateAdminCampaignInput } from "@/lib/validation";

export async function GET(request: Request) {
  const auth = await requireAdminAuth(request);
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { db } = auth;
  const { data: campaigns, error } = await db
    .from("campaigns")
    .select("*")
    .order("created_at", { ascending: false });

  if (error || !campaigns) {
    return NextResponse.json({ campaigns: [] });
  }

  return NextResponse.json({ campaigns });
}

export async function PUT(request: Request) {
  const auth = await requireAdminAuth(request);
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { db, context } = auth;
  try {
    const body = (await request.json()) as Record<string, unknown>;
    const validation = validateAdminCampaignInput(body);
    if (!validation.success) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const input = validation.data;
    const slug =
      typeof body.slug === "string" && body.slug.trim()
        ? body.slug.trim()
        : "ai-project-60m-sprint";

    const { data, error } = await db
      .from("campaigns")
      .upsert(
        {
          slug,
          name: input.name,
          description: input.description,
          registration_goal: input.registration_goal,
          start_date: input.start_date,
          end_date: input.end_date,
          budget_cap_inr: input.budget_cap_inr,
          actual_spend_inr: input.actual_spend_inr,
          utm_campaign: input.utm_campaign,
          channel_targets: input.channel_targets,
          is_active: input.is_active
        },
        { onConflict: "slug" }
      )
      .select("*")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    await recordAdminAuditLog({
      db,
      actorId: context.user.id,
      actorEmail: context.profile.email,
      action: "update_campaign_settings",
      entityType: "campaigns",
      entityId: data.id,
      metadata: {
        name: input.name,
        registration_goal: input.registration_goal,
        budget_cap_inr: input.budget_cap_inr,
        actual_spend_inr: input.actual_spend_inr,
        start_date: input.start_date,
        end_date: input.end_date
      }
    });

    return NextResponse.json({ campaign: data });
  } catch {
    return NextResponse.json({ error: "Invalid campaign settings payload." }, { status: 400 });
  }
}
