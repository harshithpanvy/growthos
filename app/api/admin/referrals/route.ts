import { NextResponse } from "next/server";
import { recordAdminAuditLog, requireAdminAuth } from "@/lib/supabase-server";
import { validateAdminReferralReviewInput } from "@/lib/validation";

export async function GET(request: Request) {
  const auth = await requireAdminAuth(request);
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { db } = auth;
  const url = new URL(request.url);
  const statusFilter = url.searchParams.get("status") || "";

  let query = db
    .from("referral_attributions")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(200);

  if (statusFilter && ["pending", "qualified", "flagged", "rejected"].includes(statusFilter)) {
    query = query.eq("status", statusFilter);
  }

  const { data: attributions, error } = await query;
  if (error) {
    return NextResponse.json({ attributions: [], referrers: [], note: error.message });
  }

  const rows = Array.isArray(attributions) ? attributions : [];
  const profileIds = new Set<string>();
  for (const r of rows) {
    profileIds.add(r.referrer_id);
    profileIds.add(r.referred_user_id);
    if (r.reviewed_by) profileIds.add(r.reviewed_by);
  }

  const profileMap = new Map<
    string,
    { id: string; full_name: string; email: string; college: string | null; referral_code: string }
  >();

  if (profileIds.size > 0) {
    const { data: profilesData } = await db
      .from("profiles")
      .select("id,full_name,email,college,referral_code")
      .in("id", Array.from(profileIds));

    if (Array.isArray(profilesData)) {
      for (const p of profilesData) {
        profileMap.set(p.id, p);
      }
    }
  }

  const enrichedAttributions = rows.map(row => ({
    ...row,
    referrer: profileMap.get(row.referrer_id) ?? null,
    referred_student: profileMap.get(row.referred_user_id) ?? null,
    reviewer: row.reviewed_by ? profileMap.get(row.reviewed_by) ?? null : null
  }));

  // Aggregate referrer summary
  const referrerSummaryMap = new Map<
    string,
    {
      referrer_id: string;
      full_name: string;
      email: string;
      college: string | null;
      referral_code: string;
      qualified_count: number;
      pending_count: number;
      flagged_count: number;
      rejected_count: number;
    }
  >();

  for (const item of enrichedAttributions) {
    const refProfile = item.referrer;
    const existing = referrerSummaryMap.get(item.referrer_id) ?? {
      referrer_id: item.referrer_id,
      full_name: refProfile?.full_name ?? "Student Referrer",
      email: refProfile?.email ?? "",
      college: refProfile?.college ?? null,
      referral_code: refProfile?.referral_code ?? item.referral_code_used,
      qualified_count: 0,
      pending_count: 0,
      flagged_count: 0,
      rejected_count: 0
    };

    if (item.status === "qualified") existing.qualified_count++;
    else if (item.status === "pending") existing.pending_count++;
    else if (item.status === "flagged") existing.flagged_count++;
    else if (item.status === "rejected") existing.rejected_count++;

    referrerSummaryMap.set(item.referrer_id, existing);
  }

  const referrers = Array.from(referrerSummaryMap.values()).sort(
    (a, b) => b.qualified_count - a.qualified_count
  );

  return NextResponse.json({
    attributions: enrichedAttributions,
    referrers
  });
}

export async function PATCH(request: Request) {
  const auth = await requireAdminAuth(request);
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { db, context } = auth;

  try {
    const body = (await request.json()) as Record<string, unknown>;
    const validation = validateAdminReferralReviewInput(body);
    if (!validation.success) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const { attribution_id, action, reason } = validation.data;

    const newStatus =
      action === "approve" ? "qualified" : action === "flag" ? "flagged" : "rejected";

    const { data: updated, error } = await db
      .from("referral_attributions")
      .update({
        status: newStatus,
        suspicious_flag: action === "flag",
        qualified_at: action === "approve" ? new Date().toISOString() : null,
        reviewed_by: context.user.id,
        review_action: action,
        review_reason: reason,
        reviewed_at: new Date().toISOString()
      })
      .eq("id", attribution_id)
      .select("*")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    // Re-evaluate referrer rewards if approved
    if (updated?.referrer_id && action === "approve") {
      await db.rpc("evaluate_and_unlock_rewards", { target_user_id: updated.referrer_id });
    }

    // Always write immutable audit log
    await recordAdminAuditLog({
      db,
      actorId: context.user.id,
      actorEmail: context.profile.email,
      action: `referral_review_${action}`,
      entityType: "referral_attributions",
      entityId: attribution_id,
      metadata: {
        referrer_id: updated?.referrer_id,
        referred_user_id: updated?.referred_user_id,
        new_status: newStatus,
        reason
      }
    });

    return NextResponse.json({ attribution: updated });
  } catch {
    return NextResponse.json({ error: "Invalid referral review payload." }, { status: 400 });
  }
}

