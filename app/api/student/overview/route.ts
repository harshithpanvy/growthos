import { NextResponse } from "next/server";
import { canStudentAccessResource } from "@/lib/referral-engine";
import { requireStudentAuth } from "@/lib/supabase-server";
import type {
  AttendanceRecord,
  LearningResource,
  PrivacySafeReferralHistoryItem,
  ProjectSubmission,
  RewardRule,
  RewardUnlock,
  Workshop
} from "@/lib/types";

export async function GET(request: Request) {
  const auth = await requireStudentAuth(request);
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { user, profile, isAdmin, client } = auth.context;

  // Trigger idempotent reward evaluation on the database if available
  await client.rpc("evaluate_and_unlock_rewards", { target_user_id: user.id }).then(() => null, () => null);

  // Fetch all student data strictly from Supabase PostgreSQL
  const [
    attributionsRes,
    historyRpcRes,
    rulesRes,
    unlocksRes,
    resourcesRes,
    workshopRes,
    attendanceRes,
    projectsRes
  ] = await Promise.all([
    client
      .from("referral_attributions")
      .select("id,status,created_at,qualified_at")
      .eq("referrer_id", user.id),
    client.rpc("get_my_referral_history"),
    client.from("reward_rules").select("*").eq("is_active", true).order("required_referrals", { ascending: true }),
    client.from("reward_unlocks").select("*").eq("user_id", user.id),
    client
      .from("resources")
      .select("*")
      .eq("is_published", true)
      .eq("is_archived", false)
      .order("unlock_threshold", { ascending: true }),
    client.from("workshops").select("*").eq("is_published", true).limit(1).maybeSingle(),
    client.from("attendance_records").select("*").eq("user_id", user.id).limit(1).maybeSingle(),
    client
      .from("project_submissions")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
  ]);

  let qualifiedReferrals = 0;
  let pendingReferrals = 0;

  if (!attributionsRes.error && Array.isArray(attributionsRes.data)) {
    for (const row of attributionsRes.data) {
      if (row.status === "qualified") qualifiedReferrals++;
      else if (row.status === "pending") pendingReferrals++;
    }
  } else {
    const { data: rpcCount } = await client.rpc("my_referral_count");
    if (typeof rpcCount === "number") {
      qualifiedReferrals = rpcCount;
    }
  }

  const rewardRules: RewardRule[] =
    !rulesRes.error && Array.isArray(rulesRes.data) ? (rulesRes.data as RewardRule[]) : [];

  const rawResources: LearningResource[] =
    !resourcesRes.error && Array.isArray(resourcesRes.data)
      ? (resourcesRes.data as LearningResource[])
      : [];

  // CRITICAL SECURITY BOUNDARY: Redact protected content on the server for locked resources!
  const sanitizedResources = rawResources.map(resource => {
    const unlocked = canStudentAccessResource(resource, qualifiedReferrals, isAdmin);
    return {
      ...resource,
      unlocked,
      content_markdown: unlocked ? resource.content_markdown : null,
      external_url: unlocked ? resource.external_url : null,
      storage_path: unlocked ? resource.storage_path : null
    };
  });

  const workshop: Workshop | null =
    !workshopRes.error && workshopRes.data ? (workshopRes.data as Workshop) : null;

  const referralHistory: PrivacySafeReferralHistoryItem[] =
    !historyRpcRes.error && Array.isArray(historyRpcRes.data)
      ? (historyRpcRes.data as PrivacySafeReferralHistoryItem[])
      : [];

  const rewardUnlocks: RewardUnlock[] =
    !unlocksRes.error && Array.isArray(unlocksRes.data) ? (unlocksRes.data as RewardUnlock[]) : [];

  const attendance: AttendanceRecord | null =
    !attendanceRes.error && attendanceRes.data ? (attendanceRes.data as AttendanceRecord) : null;

  const projectSubmissions: ProjectSubmission[] =
    !projectsRes.error && Array.isArray(projectsRes.data)
      ? (projectsRes.data as ProjectSubmission[])
      : [];

  return NextResponse.json({
    profile,
    referrals: {
      qualified_count: qualifiedReferrals,
      pending_count: pendingReferrals,
      history: referralHistory
    },
    reward_rules: rewardRules,
    reward_unlocks: rewardUnlocks,
    resources: sanitizedResources,
    workshop,
    attendance,
    project_submissions: projectSubmissions
  });
}
