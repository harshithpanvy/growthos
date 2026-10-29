import { isValidReferralCodeFormat, normalizeEmail, normalizeReferralCode } from "./validation.ts";
import type { LearningResource, ReferralAttribution, RewardRule, RewardUnlock, RubricDimension } from "./types.ts";

const ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ"; // Avoid ambiguous 0/O, 1/I

/**
 * Generates a unique referral code such as GROW-7F2A9B.
 * Retries automatically if a collision occurs in `existingCodes`.
 */
export function generateUniqueReferralCode(
  existingCodes: Set<string> = new Set(),
  prefix = "GROW",
  randomBytes?: () => number[]
): string {
  for (let attempt = 0; attempt < 50; attempt++) {
    let suffix = "";
    const bytes = randomBytes
      ? randomBytes()
      : Array.from({ length: 6 }, () => Math.floor(Math.random() * 256));
    for (let i = 0; i < 6; i++) {
      const idx = (bytes[i] ?? Math.floor(Math.random() * ALPHABET.length)) % ALPHABET.length;
      suffix += ALPHABET[idx];
    }
    const candidate = `${prefix.toUpperCase()}-${suffix}`;
    if (!existingCodes.has(candidate)) {
      return candidate;
    }
  }
  throw new Error("Unable to generate a unique referral code after 50 attempts.");
}

/**
 * Builds the canonical referral URL for a given referral code and site origin.
 */
export function buildReferralUrl(referralCode: string, origin: string, path = "/register"): string {
  const cleanOrigin = origin.replace(/\/+$/, "");
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  const normalizedCode = normalizeReferralCode(referralCode) ?? "GROW-000000";
  return `${cleanOrigin}${cleanPath}?ref=${encodeURIComponent(normalizedCode)}`;
}

export interface ReferrerCandidate {
  id: string;
  email: string;
  referral_code: string;
  referred_by: string | null;
}

export interface NewRegistrantContext {
  id: string;
  email: string;
  submitted_referral_code: string | null;
  email_verified: boolean;
}

export type AttributionDecision =
  | {
      valid: true;
      referrer_id: string;
      referred_user_id: string;
      referral_code_used: string;
      status: "pending" | "qualified" | "flagged";
      suspicious_flag: boolean;
      suspicious_reason: string | null;
    }
  | {
      valid: false;
      reason:
        | "no_code_provided"
        | "malformed_code"
        | "code_not_found"
        | "self_referral_id"
        | "self_referral_email"
        | "duplicate_attribution"
        | "referral_loop_detected";
    };

/**
 * Evaluates whether a new student registration qualifies for referral attribution.
 * Enforces:
 * - Valid format & existing referrer lookup
 * - No self-referral (by ID or normalized email)
 * - No duplicate attribution for the same referred account
 * - No referral loops (A refers B and B refers A)
 * - Velocity burst flagging (>10 attributions in 10 minutes)
 */
export function evaluateReferralAttribution(params: {
  registrant: NewRegistrantContext;
  referrersByCode: Map<string, ReferrerCandidate>;
  existingAttributionsByReferredUser: Set<string>;
  recentReferrerTimestampsMs?: number[];
  nowMs?: number;
}): AttributionDecision {
  const {
    registrant,
    referrersByCode,
    existingAttributionsByReferredUser,
    recentReferrerTimestampsMs = [],
    nowMs = Date.now()
  } = params;

  const code = normalizeReferralCode(registrant.submitted_referral_code);
  if (!code) {
    return { valid: false, reason: "no_code_provided" };
  }

  if (!isValidReferralCodeFormat(code)) {
    return { valid: false, reason: "malformed_code" };
  }

  // Prevent duplicate attribution for the same referred account
  if (existingAttributionsByReferredUser.has(registrant.id)) {
    return { valid: false, reason: "duplicate_attribution" };
  }

  const referrer = referrersByCode.get(code);
  if (!referrer) {
    return { valid: false, reason: "code_not_found" };
  }

  // Prevent self-referral by user ID
  if (referrer.id === registrant.id) {
    return { valid: false, reason: "self_referral_id" };
  }

  // Prevent self-referral by normalized email
  if (normalizeEmail(referrer.email) === normalizeEmail(registrant.email)) {
    return { valid: false, reason: "self_referral_email" };
  }

  // Prevent direct referral loops (if the referrer was originally referred by this registrant)
  if (referrer.referred_by && referrer.referred_by === registrant.id) {
    return { valid: false, reason: "referral_loop_detected" };
  }

  // Check for suspicious velocity burst (>10 referrals within 10 minutes)
  const tenMinutesAgo = nowMs - 10 * 60 * 1000;
  const recentBurstCount = recentReferrerTimestampsMs.filter(ts => ts >= tenMinutesAgo).length;
  const suspiciousFlag = recentBurstCount >= 10;
  const suspiciousReason = suspiciousFlag
    ? "High velocity signup burst (>10 referrals within 10 minutes)"
    : null;

  const status = suspiciousFlag
    ? "flagged"
    : registrant.email_verified
      ? "qualified"
      : "pending";

  return {
    valid: true,
    referrer_id: referrer.id,
    referred_user_id: registrant.id,
    referral_code_used: code,
    status,
    suspicious_flag: suspiciousFlag,
    suspicious_reason: suspiciousReason
  };
}

/**
 * Counts only verified/qualified referrals for a referrer.
 * Pending, flagged, and rejected referrals are never counted toward reward unlocks.
 */
export function calculateQualifiedReferralCount(
  referrerId: string,
  attributions: Pick<ReferralAttribution, "referrer_id" | "status" | "referred_user_id">[]
): number {
  const distinctReferredUsers = new Set<string>();
  for (const item of attributions) {
    if (item.referrer_id === referrerId && item.status === "qualified") {
      distinctReferredUsers.add(item.referred_user_id);
    }
  }
  return distinctReferredUsers.size;
}

/**
 * Determines which reward rules a student is eligible for given their qualified referral count,
 * and returns only the newly unlocked rules (idempotent against `existingUnlocks`).
 */
export function computeIdempotentRewardUnlocks(params: {
  userId: string;
  qualifiedReferralCount: number;
  rewardRules: RewardRule[];
  existingUnlocks: Pick<RewardUnlock, "user_id" | "reward_rule_id">[];
  nowIso?: string;
}): {
  allEligibleRules: RewardRule[];
  newUnlocksToInsert: Omit<RewardUnlock, "id">[];
} {
  const {
    userId,
    qualifiedReferralCount,
    rewardRules,
    existingUnlocks,
    nowIso = new Date().toISOString()
  } = params;

  const unlockedRuleIds = new Set(
    existingUnlocks.filter(u => u.user_id === userId).map(u => u.reward_rule_id)
  );

  const allEligibleRules = rewardRules
    .filter(rule => rule.is_active && rule.required_referrals <= qualifiedReferralCount)
    .sort((a, b) => a.required_referrals - b.required_referrals);

  const newUnlocksToInsert: Omit<RewardUnlock, "id">[] = [];
  for (const rule of allEligibleRules) {
    if (!unlockedRuleIds.has(rule.id)) {
      unlockedRuleIds.add(rule.id);
      newUnlocksToInsert.push({
        user_id: userId,
        reward_rule_id: rule.id,
        unlock_reason:
          rule.required_referrals === 0
            ? "starter_kit_registration"
            : `reached_${rule.required_referrals}_qualified_referrals`,
        qualified_referrals_at_unlock: qualifiedReferralCount,
        unlocked_at: nowIso
      });
    }
  }

  return {
    allEligibleRules,
    newUnlocksToInsert
  };
}

/**
 * Checks whether a student is authorized to access a specific learning resource.
 * Enforces backend eligibility rules: published, not archived, and qualifiedReferralCount >= unlock_threshold.
 */
export function canStudentAccessResource(
  resource: Pick<LearningResource, "is_published" | "is_archived" | "unlock_threshold">,
  qualifiedReferralCount: number,
  isAdmin = false
): boolean {
  if (isAdmin) return true;
  if (!resource.is_published || resource.is_archived) return false;
  return qualifiedReferralCount >= resource.unlock_threshold;
}

/**
 * Formats a referred student's full name into a privacy-safe display label (e.g. "Aarav R.").
 * Never exposes email addresses or full private identifiers.
 */
export function maskStudentNameForPrivacy(fullName?: string | null): string {
  if (!fullName || !fullName.trim()) return "Student Peer";
  const parts = fullName.trim().split(/\s+/);
  const first = parts[0];
  const secondInitial = parts.length > 1 && parts[1][0] ? ` ${parts[1][0].toUpperCase()}.` : "";
  return `${first}${secondInitial}`;
}

/**
 * Calculates campaign funnel & cost metrics safely without dividing by zero or fabricating denominators.
 */
export function computeCampaignAnalyticsMetrics(params: {
  totalRegistrations: number;
  referralAttributedRegistrations: number;
  qualifiedReferrals: number;
  landingViews: number;
  attendanceTrackedCount: number;
  attendancePresentCount: number;
  projectSubmissionsCount: number;
  actualSpendInr: number;
}): {
  referral_conversion_rate_percent: number | null;
  qualified_referral_rate_percent: number | null;
  landing_conversion_rate_percent: number | null;
  attendance_rate_percent: number | null;
  project_submission_rate_percent: number | null;
  cost_per_registration_inr: number | null;
} {
  const {
    totalRegistrations,
    referralAttributedRegistrations,
    qualifiedReferrals,
    landingViews,
    attendanceTrackedCount,
    attendancePresentCount,
    projectSubmissionsCount,
    actualSpendInr
  } = params;

  const round1 = (val: number) => Math.round(val * 10) / 10;
  const round2 = (val: number) => Math.round(val * 100) / 100;

  return {
    // Share of total registrations attributed to a referral link
    referral_conversion_rate_percent:
      totalRegistrations > 0 ? round1((referralAttributedRegistrations / totalRegistrations) * 100) : null,
    // Share of referral-attributed registrations that have completed qualification
    qualified_referral_rate_percent:
      referralAttributedRegistrations > 0
        ? round1((qualifiedReferrals / referralAttributedRegistrations) * 100)
        : null,
    // Only calculated when actual landing page view tracking events exist (>0)
    landing_conversion_rate_percent:
      landingViews > 0 ? round1(Math.min(100, (totalRegistrations / landingViews) * 100)) : null,
    // Only calculated when attendance has been recorded for at least 1 student
    attendance_rate_percent:
      attendanceTrackedCount > 0 ? round1((attendancePresentCount / attendanceTrackedCount) * 100) : null,
    // Share of registered students who submitted a workshop project
    project_submission_rate_percent:
      totalRegistrations > 0 ? round1((projectSubmissionsCount / totalRegistrations) * 100) : null,
    // Only calculated when registrations > 0 and spend >= 0
    cost_per_registration_inr:
      totalRegistrations > 0 && actualSpendInr >= 0 ? round2(actualSpendInr / totalRegistrations) : null
  };
}

/**
 * Deterministic text-rubric assistant for student project submissions.
 * Explicitly labelled as a text-based rubric heuristic (`is_automated_heuristic: true`) —
 * never claims to execute code or audit external repositories.
 */
export function evaluateProjectSubmissionHeuristic(input: {
  title: string;
  problem_statement: string;
  description: string;
  tech_stack: string;
  repo_url: string | null;
  demo_url: string | null;
}): {
  score: number;
  verdict: string;
  dimensions: RubricDimension[];
  improvements: string[];
  is_automated_heuristic: true;
} {
  const probLower = `${input.problem_statement} ${input.description}`.toLowerCase();
  const stackLower = input.tech_stack.toLowerCase();

  let problemScore = 14;
  if (input.problem_statement.length >= 60) problemScore += 6;
  if (
    probLower.includes("student") ||
    probLower.includes("user") ||
    probLower.includes("workflow") ||
    probLower.includes("time") ||
    probLower.includes("automate")
  ) {
    problemScore += 5;
  }
  problemScore = Math.min(25, problemScore);

  let architectureScore = 14;
  if (stackLower.includes("json") || stackLower.includes("schema") || stackLower.includes("structured")) {
    architectureScore += 7;
  }
  if (
    stackLower.includes("validation") ||
    stackLower.includes("fallback") ||
    stackLower.includes("guardrail") ||
    stackLower.includes("error")
  ) {
    architectureScore += 5;
  }
  if (
    stackLower.includes("gemini") ||
    stackLower.includes("openai") ||
    stackLower.includes("llama") ||
    stackLower.includes("groq") ||
    stackLower.includes("claude")
  ) {
    architectureScore += 4;
  }
  architectureScore = Math.min(30, architectureScore);

  let executionScore = 12;
  if (input.repo_url) executionScore += 7;
  if (input.demo_url) executionScore += 6;
  executionScore = Math.min(25, executionScore);

  let documentationScore = 12;
  if (input.description.length >= 80) documentationScore += 5;
  if (input.title.length >= 10) documentationScore += 3;
  documentationScore = Math.min(20, documentationScore);

  const total = problemScore + architectureScore + executionScore + documentationScore;

  const improvements: string[] = [];
  if (!stackLower.includes("json") && !stackLower.includes("schema")) {
    improvements.push("Document how your prompt enforces structured JSON output to prevent malformed responses.");
  }
  if (!input.demo_url) {
    improvements.push("Include a deployed live URL alongside your repository so reviewers can inspect the UI flow.");
  }
  if (!stackLower.includes("fallback") && !stackLower.includes("error")) {
    improvements.push("Explain your fallback state when the external AI API times out or hits a rate limit.");
  }
  if (improvements.length === 0) {
    improvements.push("Add sample input presets and an architecture diagram to your repository README.");
  }

  const verdict =
    total >= 85
      ? "Strong Workshop Build — Ready for Instructor Review"
      : total >= 70
        ? "Complete Prototype — Consider Adding Schema Guardrails"
        : "Initial Submission — Expand Architecture & Problem Details";

  return {
    score: total,
    verdict,
    is_automated_heuristic: true,
    dimensions: [
      {
        label: "Problem Clarity & User Scope",
        score: problemScore,
        max: 25,
        note: "Evaluated from your written problem statement length and specificity"
      },
      {
        label: "AI Prompt & Error-Handling Architecture",
        score: architectureScore,
        max: 30,
        note: "Evaluated from documented schema validation and fallback descriptions"
      },
      {
        label: "Repository & Live Demo Links Provided",
        score: executionScore,
        max: 25,
        note: "Checks presence of repository and deployment links (links are not auto-executed)"
      },
      {
        label: "Documentation & Technical Explanation",
        score: documentationScore,
        max: 20,
        note: "Evaluated from submission description completeness"
      }
    ],
    improvements
  };
}

