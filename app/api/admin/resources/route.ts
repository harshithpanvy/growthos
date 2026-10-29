import { NextResponse } from "next/server";
import { recordAdminAuditLog, requireAdminAuth } from "@/lib/supabase-server";
import { validateAdminResourceInput } from "@/lib/validation";

export async function GET(request: Request) {
  const auth = await requireAdminAuth(request);
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { db } = auth;
  const [resourcesRes, rulesRes, accessRes, unlocksRes] = await Promise.all([
    db.from("resources").select("*").order("unlock_threshold", { ascending: true }),
    db.from("reward_rules").select("*").order("required_referrals", { ascending: true }),
    db.from("resource_access_events").select("resource_id"),
    db.from("reward_unlocks").select("reward_rule_id")
  ]);

  const resources =
    !resourcesRes.error && Array.isArray(resourcesRes.data) ? resourcesRes.data : [];

  const rewardRules =
    !rulesRes.error && Array.isArray(rulesRes.data) ? rulesRes.data : [];

  const accessCountMap = new Map<string, number>();
  if (!accessRes.error && Array.isArray(accessRes.data)) {
    for (const row of accessRes.data) {
      accessCountMap.set(row.resource_id, (accessCountMap.get(row.resource_id) ?? 0) + 1);
    }
  }

  const unlockCountMap = new Map<string, number>();
  if (!unlocksRes.error && Array.isArray(unlocksRes.data)) {
    for (const row of unlocksRes.data) {
      unlockCountMap.set(row.reward_rule_id, (unlockCountMap.get(row.reward_rule_id) ?? 0) + 1);
    }
  }

  return NextResponse.json({
    resources: resources.map(r => ({
      ...r,
      access_count: accessCountMap.get(r.id) ?? 0
    })),
    reward_rules: rewardRules.map(rule => ({
      ...rule,
      unlock_count: unlockCountMap.get(rule.id) ?? 0
    }))
  });
}

export async function POST(request: Request) {
  const auth = await requireAdminAuth(request);
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { db, context } = auth;
  try {
    const body = (await request.json()) as Record<string, unknown>;

    // Allow creating a new reward rule milestone in the database
    if (body.entity === "reward_rule") {
      const milestoneName = typeof body.milestone_name === "string" ? body.milestone_name.trim() : "";
      const description = typeof body.description === "string" ? body.description.trim() : "";
      const requiredReferrals = Number(body.required_referrals ?? 0);
      const slug =
        typeof body.slug === "string" && body.slug.trim()
          ? body.slug.trim().toLowerCase()
          : `milestone-${requiredReferrals}-${Date.now()}`;

      if (!milestoneName || !description || !Number.isInteger(requiredReferrals) || requiredReferrals < 0) {
        return NextResponse.json(
          { error: "Milestone name, description, and non-negative required_referrals are required." },
          { status: 400 }
        );
      }

      const { data: ruleData, error: ruleErr } = await db
        .from("reward_rules")
        .insert({
          slug,
          milestone_name: milestoneName,
          description,
          required_referrals: requiredReferrals,
          sort_order: requiredReferrals,
          is_active: true
        })
        .select("*")
        .single();

      if (ruleErr) {
        return NextResponse.json({ error: ruleErr.message }, { status: 400 });
      }

      await recordAdminAuditLog({
        db,
        actorId: context.user.id,
        actorEmail: context.profile.email,
        action: "create_reward_rule",
        entityType: "reward_rules",
        entityId: ruleData.id,
        metadata: { milestone_name: milestoneName, required_referrals: requiredReferrals }
      });

      return NextResponse.json({ reward_rule: ruleData }, { status: 201 });
    }

    const validation = validateAdminResourceInput(body);
    if (!validation.success) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const input = validation.data;
    const { data, error } = await db
      .from("resources")
      .insert({
        slug: input.slug,
        title: input.title,
        description: input.description,
        resource_type: input.resource_type,
        unlock_threshold: input.unlock_threshold,
        content_markdown: input.content_markdown,
        external_url: input.external_url,
        storage_bucket: input.storage_bucket,
        storage_path: input.storage_path,
        is_published: input.is_published,
        is_archived: input.is_archived
      })
      .select("*")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    await recordAdminAuditLog({
      db,
      actorId: context.user.id,
      actorEmail: context.profile.email,
      action: "create_resource",
      entityType: "resources",
      entityId: data.id,
      metadata: {
        title: input.title,
        unlock_threshold: input.unlock_threshold,
        is_published: input.is_published
      }
    });

    return NextResponse.json({ resource: data }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Invalid resource creation payload." }, { status: 400 });
  }
}

export async function PATCH(request: Request) {
  const auth = await requireAdminAuth(request);
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { db, context } = auth;
  try {
    const body = (await request.json()) as Record<string, unknown>;

    if (body.entity === "reward_rule") {
      const ruleId = typeof body.id === "string" ? body.id.trim() : "";
      const milestoneName = typeof body.milestone_name === "string" ? body.milestone_name.trim() : "";
      const requiredReferrals = Number(body.required_referrals);
      if (!ruleId || !milestoneName || !Number.isInteger(requiredReferrals) || requiredReferrals < 0) {
        return NextResponse.json({ error: "Invalid reward rule threshold parameters." }, { status: 400 });
      }

      const { data: ruleData, error: ruleErr } = await db
        .from("reward_rules")
        .update({
          milestone_name: milestoneName,
          description: typeof body.description === "string" ? body.description.trim() : undefined,
          required_referrals: requiredReferrals,
          is_active: Boolean(body.is_active ?? true)
        })
        .eq("id", ruleId)
        .select("*")
        .single();

      if (ruleErr) {
        return NextResponse.json({ error: ruleErr.message }, { status: 400 });
      }

      await recordAdminAuditLog({
        db,
        actorId: context.user.id,
        actorEmail: context.profile.email,
        action: "update_reward_rule",
        entityType: "reward_rules",
        entityId: ruleId,
        metadata: { milestone_name: milestoneName, required_referrals: requiredReferrals }
      });

      return NextResponse.json({ reward_rule: ruleData });
    }

    const validation = validateAdminResourceInput(body);
    if (!validation.success || !validation.data.id) {
      return NextResponse.json(
        { error: validation.success ? "Resource ID is required for updates." : validation.error },
        { status: 400 }
      );
    }

    const input = validation.data;
    const { data, error } = await db
      .from("resources")
      .update({
        title: input.title,
        description: input.description,
        resource_type: input.resource_type,
        unlock_threshold: input.unlock_threshold,
        content_markdown: input.content_markdown,
        external_url: input.external_url,
        storage_bucket: input.storage_bucket,
        storage_path: input.storage_path,
        is_published: input.is_published,
        is_archived: input.is_archived
      })
      .eq("id", input.id)
      .select("*")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    await recordAdminAuditLog({
      db,
      actorId: context.user.id,
      actorEmail: context.profile.email,
      action: "update_resource",
      entityType: "resources",
      entityId: input.id,
      metadata: {
        title: input.title,
        unlock_threshold: input.unlock_threshold,
        is_published: input.is_published,
        is_archived: input.is_archived
      }
    });

    return NextResponse.json({ resource: data });
  } catch {
    return NextResponse.json({ error: "Invalid resource update payload." }, { status: 400 });
  }
}
