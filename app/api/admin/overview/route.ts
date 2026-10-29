import { NextResponse } from "next/server";
import { computeCampaignAnalyticsMetrics } from "@/lib/referral-engine";
import { requireAdminAuth } from "@/lib/supabase-server";
import type { AdminAnalyticsOverview, Campaign, RewardRule } from "@/lib/types";

export async function GET(request: Request) {
  const auth = await requireAdminAuth(request);
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { db } = auth;

  const [
    profilesRes,
    attributionsRes,
    unlocksRes,
    rulesRes,
    attendanceRes,
    projectsRes,
    campaignRes,
    landingViewsRes
  ] = await Promise.all([
    db
      .from("profiles")
      .select("id,role,acquisition_source,referred_by,email_verified,created_at")
      .order("created_at", { ascending: true }),
    db.from("referral_attributions").select("id,referrer_id,referred_user_id,status,suspicious_flag"),
    db.from("reward_unlocks").select("id,reward_rule_id"),
    db.from("reward_rules").select("*").order("required_referrals", { ascending: true }),
    db.from("attendance_records").select("id,status"),
    db.from("project_submissions").select("id,review_status"),
    db.from("campaigns").select("*").order("created_at", { ascending: false }).limit(1).maybeSingle(),
    db
      .from("attribution_events")
      .select("id", { count: "exact", head: true })
      .eq("event_type", "landing_view")
  ]);

  const profiles = Array.isArray(profilesRes.data) ? profilesRes.data : [];
  const totalRegistrations = profiles.length;

  const todayIsoPrefix = new Date().toISOString().slice(0, 10);
  let registrationsToday = 0;
  let verifiedEmailRegistrations = 0;
  let referralAttributedRegistrations = 0;

  const sourceCounts = new Map<string, number>();
  const dayCounts = new Map<string, number>();

  for (const p of profiles) {
    const createdDay = typeof p.created_at === "string" ? p.created_at.slice(0, 10) : "Unknown";
    if (createdDay === todayIsoPrefix) registrationsToday++;
    if (p.email_verified) verifiedEmailRegistrations++;
    if (p.referred_by) referralAttributedRegistrations++;

    const src = (p.acquisition_source && p.acquisition_source.trim()) || "Direct / Unspecified";
    sourceCounts.set(src, (sourceCounts.get(src) ?? 0) + 1);
    dayCounts.set(createdDay, (dayCounts.get(createdDay) ?? 0) + 1);
  }

  let qualifiedReferrals = 0;
  let pendingReferrals = 0;
  let flaggedReferrals = 0;

  if (!attributionsRes.error && Array.isArray(attributionsRes.data)) {
    for (const r of attributionsRes.data) {
      if (r.status === "qualified") qualifiedReferrals++;
      else if (r.status === "pending") pendingReferrals++;
      if (r.status === "flagged" || r.suspicious_flag) flaggedReferrals++;
    }
  } else {
    qualifiedReferrals = referralAttributedRegistrations;
  }

  const attendanceRows = Array.isArray(attendanceRes.data) ? attendanceRes.data : [];
  const attendanceTrackedCount = attendanceRows.length;
  const attendancePresentCount = attendanceRows.filter(a => a.status === "attended").length;

  const projectRows = Array.isArray(projectsRes.data) ? projectsRes.data : [];
  const projectSubmissionsCount = projectRows.length;

  const campaign: Campaign | null =
    !campaignRes.error && campaignRes.data ? (campaignRes.data as Campaign) : null;

  const landingViews = typeof landingViewsRes.count === "number" ? landingViewsRes.count : 0;

  const rates = computeCampaignAnalyticsMetrics({
    totalRegistrations,
    referralAttributedRegistrations,
    qualifiedReferrals,
    landingViews,
    attendanceTrackedCount,
    attendancePresentCount,
    projectSubmissionsCount,
    actualSpendInr: Number(campaign?.actual_spend_inr ?? 0)
  });

  const rules: RewardRule[] =
    !rulesRes.error && Array.isArray(rulesRes.data) ? (rulesRes.data as RewardRule[]) : [];

  const unlockRows = Array.isArray(unlocksRes.data) ? unlocksRes.data : [];
  const unlocksByRuleId = new Map<string, number>();
  for (const u of unlockRows) {
    unlocksByRuleId.set(u.reward_rule_id, (unlocksByRuleId.get(u.reward_rule_id) ?? 0) + 1);
  }

  const unlocksByMilestone = rules.map(rule => ({
    milestone: rule.milestone_name,
    required_referrals: rule.required_referrals,
    count: unlocksByRuleId.get(rule.id) ?? 0
  }));

  const registrationsBySource = Array.from(sourceCounts.entries())
    .map(([source, count]) => ({ source, count }))
    .sort((a, b) => b.count - a.count);

  const registrationsByDay = Array.from(dayCounts.entries())
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => a.date.localeCompare(b.date));

  const overview: AdminAnalyticsOverview = {
    is_configured: true,
    actuals: {
      total_registrations: totalRegistrations,
      registrations_today: registrationsToday,
      verified_email_registrations: verifiedEmailRegistrations,
      referral_attributed_registrations: referralAttributedRegistrations,
      qualified_referrals: qualifiedReferrals,
      pending_referrals: pendingReferrals,
      flagged_referrals: flaggedReferrals,
      referral_conversion_rate_percent: rates.referral_conversion_rate_percent,
      qualified_referral_rate_percent: rates.qualified_referral_rate_percent,
      landing_views: landingViews,
      landing_conversion_rate_percent: rates.landing_conversion_rate_percent,
      total_reward_unlocks: unlockRows.length,
      attendance_tracked_count: attendanceTrackedCount,
      attendance_present_count: attendancePresentCount,
      attendance_rate_percent: rates.attendance_rate_percent,
      project_submissions_count: projectSubmissionsCount,
      project_submission_rate_percent: rates.project_submission_rate_percent,
      cost_per_registration_inr: rates.cost_per_registration_inr,
      registrations_by_source: registrationsBySource,
      registrations_by_day: registrationsByDay,
      unlocks_by_milestone: unlocksByMilestone
    },
    campaign
  };

  return NextResponse.json(overview);
}
