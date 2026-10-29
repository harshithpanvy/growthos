export type UserRole = "student" | "admin";

export interface Profile {
  id: string;
  full_name: string;
  email: string;
  college: string | null;
  graduation_year: string | null;
  role: UserRole;
  acquisition_source: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  landing_page: string | null;
  referral_code: string;
  referred_by: string | null;
  email_verified: boolean;
  created_at: string;
  updated_at: string;
}

export interface Campaign {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  registration_goal: number;
  start_date: string;
  end_date: string;
  budget_cap_inr: number;
  actual_spend_inr: number;
  utm_campaign: string;
  channel_targets: {
    college_clubs: number;
    whatsapp_communities: number;
    social_posts: number;
    referral_conversions: number;
  };
  budget_allocation: {
    paid_promotion_inr: number;
    ambassador_materials_inr: number;
    contingency_inr: number;
  };
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface WorkshopAgendaItem {
  time: string;
  title: string;
  detail: string;
}

export interface WorkshopChecklistItem {
  id: string;
  label: string;
}

export interface Workshop {
  id: string;
  slug: string;
  title: string;
  subtitle: string;
  description: string;
  scheduled_at: string | null;
  timezone: string;
  duration_minutes: number;
  joining_url: string | null;
  agenda: WorkshopAgendaItem[];
  preparation_checklist: WorkshopChecklistItem[];
  is_published: boolean;
  project_submissions_enabled: boolean;
  created_at: string;
  updated_at: string;
}

export type ReferralStatus = "pending" | "qualified" | "flagged" | "rejected";

export interface ReferralAttribution {
  id: string;
  referrer_id: string;
  referred_user_id: string;
  referral_code_used: string;
  status: ReferralStatus;
  qualification_policy: string;
  qualified_at: string | null;
  suspicious_flag: boolean;
  suspicious_reason: string | null;
  reviewed_by: string | null;
  review_reason: string | null;
  review_action: "approve" | "flag" | "reject" | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface PrivacySafeReferralHistoryItem {
  attribution_id: string;
  referred_display_name: string;
  referred_college: string;
  status: ReferralStatus;
  created_at: string;
  qualified_at: string | null;
}

export interface RewardRule {
  id: string;
  slug: string;
  milestone_name: string;
  description: string;
  required_referrals: number;
  sort_order: number;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export type ResourceType = "guide" | "template" | "prompt_pack" | "roadmap" | "link" | "checklist";

export interface LearningResource {
  id: string;
  slug: string;
  title: string;
  description: string;
  resource_type: ResourceType;
  unlock_threshold: number;
  reward_rule_id: string | null;
  content_markdown: string | null;
  external_url: string | null;
  storage_bucket: string | null;
  storage_path: string | null;
  is_published: boolean;
  is_archived: boolean;
  created_at: string;
  updated_at: string;
}

export interface RewardUnlock {
  id: string;
  user_id: string;
  reward_rule_id: string;
  unlock_reason: string;
  qualified_referrals_at_unlock: number;
  unlocked_at: string;
}

export type AttendanceStatus = "registered" | "attended" | "absent";

export interface AttendanceRecord {
  id: string;
  workshop_id: string;
  user_id: string;
  status: AttendanceStatus;
  source: "registration" | "manual_admin" | "csv_import";
  marked_by: string | null;
  notes: string | null;
  marked_at: string;
  updated_at: string;
}

export type ProjectReviewStatus = "submitted" | "under_review" | "approved" | "needs_work";

export interface RubricDimension {
  label: string;
  score: number;
  max: number;
  note: string;
}

export interface ProjectSubmission {
  id: string;
  user_id: string;
  workshop_id: string | null;
  title: string;
  problem_statement: string;
  description: string;
  tech_stack: string;
  repo_url: string | null;
  demo_url: string | null;
  notes: string | null;
  ai_rubric_score: number | null;
  ai_rubric_breakdown: {
    verdict: string;
    dimensions: RubricDimension[];
    improvements: string[];
    is_automated_heuristic: boolean;
  } | null;
  review_status: ProjectReviewStatus;
  reviewer_notes: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface AdminAuditLog {
  id: string;
  actor_id: string | null;
  actor_email: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface AdminAnalyticsOverview {
  is_configured: boolean;
  actuals: {
    total_registrations: number;
    registrations_today: number;
    verified_email_registrations: number;
    referral_attributed_registrations: number;
    qualified_referrals: number;
    pending_referrals: number;
    flagged_referrals: number;
    referral_conversion_rate_percent: number | null;
    qualified_referral_rate_percent: number | null;
    landing_views: number;
    landing_conversion_rate_percent: number | null;
    total_reward_unlocks: number;
    attendance_tracked_count: number;
    attendance_present_count: number;
    attendance_rate_percent: number | null;
    project_submissions_count: number;
    project_submission_rate_percent: number | null;
    cost_per_registration_inr: number | null;
    registrations_by_source: { source: string; count: number }[];
    registrations_by_day: { date: string; count: number }[];
    unlocks_by_milestone: { milestone: string; required_referrals: number; count: number }[];
  };
  campaign: Campaign | null;
}

