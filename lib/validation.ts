/**
 * Strict, zero-dependency validation schemas for all sensitive input boundaries.
 * Enforces email normalization, field lengths, URL safety, and blocks privilege escalation fields.
 */

export type ValidationResult<T> =
  | { success: true; data: T }
  | { success: false; error: string; fieldErrors?: Record<string, string> };

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const REFERRAL_CODE_REGEX = /^[A-Z0-9-]{4,24}$/;

export function normalizeEmail(raw: string): string {
  return raw.trim().toLowerCase();
}

export function normalizeReferralCode(raw?: string | null): string | null {
  if (!raw) return null;
  const cleaned = raw.trim().toUpperCase();
  if (!cleaned) return null;
  return cleaned;
}

export function isValidReferralCodeFormat(code: string): boolean {
  return REFERRAL_CODE_REGEX.test(code.trim().toUpperCase());
}

export function isSafeHttpUrl(raw?: string | null): boolean {
  if (!raw || !raw.trim()) return true;
  try {
    const parsed = new URL(raw.trim());
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

export function sanitizeRedirectPath(raw?: string | null, fallback = "/dashboard"): string {
  if (!raw || typeof raw !== "string") return fallback;
  const trimmed = raw.trim();
  // Prevent open redirects (must start with single `/` and not `//` or `/\`)
  if (!trimmed.startsWith("/") || trimmed.startsWith("//") || trimmed.startsWith("/\\")) {
    return fallback;
  }
  return trimmed;
}

export interface RegistrationInput {
  full_name: string;
  email: string;
  password: string;
  college: string;
  graduation_year: string;
  acquisition_source: string;
  referral_code: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  landing_page: string | null;
}

export function validateRegistrationInput(payload: Record<string, unknown>): ValidationResult<RegistrationInput> {
  const fieldErrors: Record<string, string> = {};

  const fullName = typeof payload.full_name === "string" ? payload.full_name.trim() : "";
  if (fullName.length < 2 || fullName.length > 100) {
    fieldErrors.full_name = "Full name must be between 2 and 100 characters.";
  }

  const rawEmail = typeof payload.email === "string" ? payload.email : "";
  const email = normalizeEmail(rawEmail);
  if (!email || !EMAIL_REGEX.test(email) || email.length > 160) {
    fieldErrors.email = "Please enter a valid college or personal email address.";
  }

  const password = typeof payload.password === "string" ? payload.password : "";
  if (password.length < 8 || password.length > 128) {
    fieldErrors.password = "Password must be at least 8 characters long.";
  }

  const college = typeof payload.college === "string" ? payload.college.trim() : "";
  if (college.length < 2 || college.length > 140) {
    fieldErrors.college = "Please enter your college or university name (2–140 characters).";
  }

  const graduationYear = typeof payload.graduation_year === "string" ? payload.graduation_year.trim() : "";
  if (!/^(202[4-9]|203[0-2])$/.test(graduationYear)) {
    fieldErrors.graduation_year = "Graduation year must be between 2024 and 2032.";
  }

  const acquisitionSource =
    typeof payload.acquisition_source === "string" && payload.acquisition_source.trim()
      ? payload.acquisition_source.trim().slice(0, 80)
      : "Direct / Landing Page";

  const rawReferral = typeof payload.referral_code === "string" ? payload.referral_code : null;
  const referralCode = normalizeReferralCode(rawReferral);
  if (referralCode && !isValidReferralCodeFormat(referralCode)) {
    fieldErrors.referral_code = "Referral code format is invalid (expected alphanumeric code such as GROW-7F2A9B).";
  }

  if (Object.keys(fieldErrors).length > 0) {
    return {
      success: false,
      error: Object.values(fieldErrors)[0],
      fieldErrors
    };
  }

  return {
    success: true,
    data: {
      full_name: fullName,
      email,
      password,
      college,
      graduation_year: graduationYear,
      acquisition_source: acquisitionSource,
      referral_code: referralCode,
      utm_source: typeof payload.utm_source === "string" ? payload.utm_source.trim().slice(0, 80) || null : null,
      utm_medium: typeof payload.utm_medium === "string" ? payload.utm_medium.trim().slice(0, 80) || null : null,
      utm_campaign: typeof payload.utm_campaign === "string" ? payload.utm_campaign.trim().slice(0, 80) || null : null,
      landing_page: typeof payload.landing_page === "string" ? payload.landing_page.trim().slice(0, 160) || null : null
    }
  };
}

export interface ProfileUpdateInput {
  full_name: string;
  college: string;
  graduation_year: string;
}

export function validateProfileUpdateInput(payload: Record<string, unknown>): ValidationResult<ProfileUpdateInput> {
  // Explicitly reject privilege escalation or immutable fields
  const forbiddenKeys = ["role", "referral_code", "referred_by", "email", "id", "email_verified"];
  for (const key of forbiddenKeys) {
    if (key in payload) {
      return {
        success: false,
        error: `Security violation: field "${key}" cannot be modified by the user.`
      };
    }
  }

  const fieldErrors: Record<string, string> = {};
  const fullName = typeof payload.full_name === "string" ? payload.full_name.trim() : "";
  if (fullName.length < 2 || fullName.length > 100) {
    fieldErrors.full_name = "Full name must be between 2 and 100 characters.";
  }

  const college = typeof payload.college === "string" ? payload.college.trim() : "";
  if (college.length < 2 || college.length > 140) {
    fieldErrors.college = "College or university must be between 2 and 140 characters.";
  }

  const graduationYear = typeof payload.graduation_year === "string" ? payload.graduation_year.trim() : "";
  if (!/^(202[4-9]|203[0-2])$/.test(graduationYear)) {
    fieldErrors.graduation_year = "Graduation year must be between 2024 and 2032.";
  }

  if (Object.keys(fieldErrors).length > 0) {
    return {
      success: false,
      error: Object.values(fieldErrors)[0],
      fieldErrors
    };
  }

  return {
    success: true,
    data: {
      full_name: fullName,
      college,
      graduation_year: graduationYear
    }
  };
}

export interface ProjectSubmissionInput {
  title: string;
  problem_statement: string;
  description: string;
  tech_stack: string;
  repo_url: string | null;
  demo_url: string | null;
  notes: string | null;
}

export function validateProjectSubmissionInput(
  payload: Record<string, unknown>
): ValidationResult<ProjectSubmissionInput> {
  const fieldErrors: Record<string, string> = {};

  const title = typeof payload.title === "string" ? payload.title.trim() : "";
  if (title.length < 4 || title.length > 140) {
    fieldErrors.title = "Project title must be between 4 and 140 characters.";
  }

  const problemStatement =
    typeof payload.problem_statement === "string" ? payload.problem_statement.trim() : "";
  if (problemStatement.length < 15 || problemStatement.length > 1500) {
    fieldErrors.problem_statement = "Problem statement must be between 15 and 1,500 characters.";
  }

  const description = typeof payload.description === "string" ? payload.description.trim() : "";
  if (description.length < 15 || description.length > 2500) {
    fieldErrors.description = "Project description must be between 15 and 2,500 characters.";
  }

  const techStack = typeof payload.tech_stack === "string" ? payload.tech_stack.trim() : "";
  if (techStack.length < 3 || techStack.length > 500) {
    fieldErrors.tech_stack = "Please specify the tech stack and AI model/API used.";
  }

  const repoUrl = typeof payload.repo_url === "string" && payload.repo_url.trim() ? payload.repo_url.trim() : null;
  if (repoUrl && !isSafeHttpUrl(repoUrl)) {
    fieldErrors.repo_url = "Repository URL must be a valid http:// or https:// link.";
  }

  const demoUrl = typeof payload.demo_url === "string" && payload.demo_url.trim() ? payload.demo_url.trim() : null;
  if (demoUrl && !isSafeHttpUrl(demoUrl)) {
    fieldErrors.demo_url = "Live demo URL must be a valid http:// or https:// link.";
  }

  if (!repoUrl && !demoUrl) {
    fieldErrors.repo_url = "Please provide at least a repository URL or a live demo URL.";
  }

  const notes = typeof payload.notes === "string" && payload.notes.trim() ? payload.notes.trim().slice(0, 1000) : null;

  if (Object.keys(fieldErrors).length > 0) {
    return {
      success: false,
      error: Object.values(fieldErrors)[0],
      fieldErrors
    };
  }

  return {
    success: true,
    data: {
      title,
      problem_statement: problemStatement,
      description,
      tech_stack: techStack,
      repo_url: repoUrl,
      demo_url: demoUrl,
      notes
    }
  };
}

export interface AdminResourceInput {
  id?: string;
  slug: string;
  title: string;
  description: string;
  resource_type: "guide" | "template" | "prompt_pack" | "roadmap" | "link" | "checklist";
  unlock_threshold: number;
  content_markdown: string | null;
  external_url: string | null;
  storage_bucket: string | null;
  storage_path: string | null;
  is_published: boolean;
  is_archived: boolean;
}

export function validateAdminResourceInput(payload: Record<string, unknown>): ValidationResult<AdminResourceInput> {
  const title = typeof payload.title === "string" ? payload.title.trim() : "";
  if (title.length < 3 || title.length > 140) {
    return { success: false, error: "Resource title must be between 3 and 140 characters." };
  }

  const description = typeof payload.description === "string" ? payload.description.trim() : "";
  if (description.length < 10 || description.length > 600) {
    return { success: false, error: "Resource description must be between 10 and 600 characters." };
  }

  const rawSlug =
    typeof payload.slug === "string" && payload.slug.trim()
      ? payload.slug.trim().toLowerCase()
      : title
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-|-$/g, "");

  if (!rawSlug || rawSlug.length < 3) {
    return { success: false, error: "Resource slug must be at least 3 characters." };
  }

  const validTypes = ["guide", "template", "prompt_pack", "roadmap", "link", "checklist"] as const;
  const resourceType = validTypes.includes(payload.resource_type as (typeof validTypes)[number])
    ? (payload.resource_type as (typeof validTypes)[number])
    : "guide";

  const unlockThreshold = Number(payload.unlock_threshold ?? 0);
  if (!Number.isInteger(unlockThreshold) || unlockThreshold < 0 || unlockThreshold > 100) {
    return { success: false, error: "Unlock threshold must be an integer between 0 and 100 referrals." };
  }

  const externalUrl =
    typeof payload.external_url === "string" && payload.external_url.trim() ? payload.external_url.trim() : null;
  if (externalUrl && !isSafeHttpUrl(externalUrl)) {
    return { success: false, error: "External URL must start with http:// or https://." };
  }

  return {
    success: true,
    data: {
      id: typeof payload.id === "string" && payload.id.trim() ? payload.id.trim() : undefined,
      slug: rawSlug,
      title,
      description,
      resource_type: resourceType,
      unlock_threshold: unlockThreshold,
      content_markdown:
        typeof payload.content_markdown === "string" && payload.content_markdown.trim()
          ? payload.content_markdown.trim()
          : null,
      external_url: externalUrl,
      storage_bucket:
        typeof payload.storage_bucket === "string" && payload.storage_bucket.trim()
          ? payload.storage_bucket.trim()
          : null,
      storage_path:
        typeof payload.storage_path === "string" && payload.storage_path.trim()
          ? payload.storage_path.trim()
          : null,
      is_published: Boolean(payload.is_published ?? true),
      is_archived: Boolean(payload.is_archived ?? false)
    }
  };
}

export interface AdminCampaignInput {
  id?: string;
  name: string;
  description: string | null;
  registration_goal: number;
  start_date: string;
  end_date: string;
  budget_cap_inr: number;
  actual_spend_inr: number;
  utm_campaign: string;
  is_active: boolean;
  channel_targets: {
    college_clubs: number;
    whatsapp_communities: number;
    social_posts: number;
    referral_conversions: number;
  };
}

export function validateAdminCampaignInput(payload: Record<string, unknown>): ValidationResult<AdminCampaignInput> {
  const name = typeof payload.name === "string" ? payload.name.trim() : "";
  if (name.length < 3 || name.length > 160) {
    return { success: false, error: "Campaign name must be between 3 and 160 characters." };
  }

  const goal = Number(payload.registration_goal);
  if (!Number.isInteger(goal) || goal < 1 || goal > 100000) {
    return { success: false, error: "Registration goal must be a positive integer." };
  }

  const budgetCap = Number(payload.budget_cap_inr);
  if (Number.isNaN(budgetCap) || budgetCap < 0 || budgetCap > 10000000) {
    return { success: false, error: "Budget cap must be a non-negative number." };
  }

  const actualSpend = Number(payload.actual_spend_inr ?? 0);
  if (Number.isNaN(actualSpend) || actualSpend < 0 || actualSpend > 10000000) {
    return { success: false, error: "Actual recorded spend must be a non-negative number." };
  }

  const startDate = typeof payload.start_date === "string" ? payload.start_date.trim() : "";
  const endDate = typeof payload.end_date === "string" ? payload.end_date.trim() : "";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate) || !/^\d{4}-\d{2}-\d{2}$/.test(endDate)) {
    return { success: false, error: "Start and end dates must be in YYYY-MM-DD format." };
  }
  if (endDate < startDate) {
    return { success: false, error: "Campaign end date cannot be earlier than start date." };
  }

  const utmCampaign =
    typeof payload.utm_campaign === "string" && payload.utm_campaign.trim()
      ? payload.utm_campaign.trim().slice(0, 80)
      : "ai_project_60m";

  const rawChannels = (payload.channel_targets as Record<string, unknown>) || {};
  return {
    success: true,
    data: {
      id: typeof payload.id === "string" ? payload.id : undefined,
      name,
      description: typeof payload.description === "string" ? payload.description.trim() : null,
      registration_goal: goal,
      start_date: startDate,
      end_date: endDate,
      budget_cap_inr: budgetCap,
      actual_spend_inr: actualSpend,
      utm_campaign: utmCampaign,
      is_active: Boolean(payload.is_active ?? true),
      channel_targets: {
        college_clubs: Math.max(0, Math.round(Number(rawChannels.college_clubs ?? 250))),
        whatsapp_communities: Math.max(0, Math.round(Number(rawChannels.whatsapp_communities ?? 150))),
        social_posts: Math.max(0, Math.round(Number(rawChannels.social_posts ?? 70))),
        referral_conversions: Math.max(0, Math.round(Number(rawChannels.referral_conversions ?? 30)))
      }
    }
  };
}

export interface AdminReferralReviewInput {
  attribution_id: string;
  action: "approve" | "flag" | "reject";
  reason: string;
}

export function validateAdminReferralReviewInput(
  payload: Record<string, unknown>
): ValidationResult<AdminReferralReviewInput> {
  const attributionId = typeof payload.attribution_id === "string" ? payload.attribution_id.trim() : "";
  if (!attributionId) {
    return { success: false, error: "Attribution ID is required." };
  }

  const action = payload.action;
  if (action !== "approve" && action !== "flag" && action !== "reject") {
    return { success: false, error: "Review action must be approve, flag, or reject." };
  }

  const reason = typeof payload.reason === "string" ? payload.reason.trim() : "";
  if (reason.length < 5 || reason.length > 500) {
    return {
      success: false,
      error: "An explicit audit reason (5–500 characters) is required when reviewing a referral."
    };
  }

  return {
    success: true,
    data: {
      attribution_id: attributionId,
      action,
      reason
    }
  };
}

