import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { DEFAULT_LEARNING_RESOURCES, DEFAULT_REWARD_RULES } from "../lib/default-data.ts";
import {
  buildReferralUrl,
  calculateQualifiedReferralCount,
  canStudentAccessResource,
  computeCampaignAnalyticsMetrics,
  computeIdempotentRewardUnlocks,
  evaluateProjectSubmissionHeuristic,
  evaluateReferralAttribution,
  generateUniqueReferralCode,
  maskStudentNameForPrivacy,
  type ReferrerCandidate
} from "../lib/referral-engine.ts";
import {
  normalizeEmail,
  sanitizeRedirectPath,
  validateAdminCampaignInput,
  validateAdminReferralReviewInput,
  validateProfileUpdateInput,
  validateProjectSubmissionInput,
  validateRegistrationInput
} from "../lib/validation.ts";

describe("GrowthOS — Referral Engine & Reward Milestone Tests", () => {
  it("generates unique referral codes in GROW-XXXXXX format and avoids collisions", () => {
    const existing = new Set<string>(["GROW-222222"]);
    let callCount = 0;
    const code = generateUniqueReferralCode(existing, "GROW", () => {
      callCount++;
      // First attempt collides with GROW-222222 (index 0 -> '2'), second attempt succeeds
      return callCount === 1 ? [0, 0, 0, 0, 0, 0] : [1, 2, 3, 4, 5, 6];
    });

    assert.notEqual(code, "GROW-222222");
    assert.match(code, /^GROW-[A-Z0-9]{6}$/);
  });

  it("preserves referral code in canonical registration URL", () => {
    const url = buildReferralUrl("grow-7f2a9b", "https://growthos.example.com/", "/register");
    assert.equal(url, "https://growthos.example.com/register?ref=GROW-7F2A9B");
  });

  it("attributes valid referral as pending before email confirmation and qualified after confirmation", () => {
    const referrers = new Map<string, ReferrerCandidate>([
      [
        "GROW-7F2A9B",
        {
          id: "user-referrer-1",
          email: "referrer@college.edu",
          referral_code: "GROW-7F2A9B",
          referred_by: null
        }
      ]
    ]);

    const pendingDecision = evaluateReferralAttribution({
      registrant: {
        id: "user-new-2",
        email: "newstudent@college.edu",
        submitted_referral_code: "grow-7f2a9b",
        email_verified: false
      },
      referrersByCode: referrers,
      existingAttributionsByReferredUser: new Set()
    });

    assert.equal(pendingDecision.valid, true);
    if (pendingDecision.valid) {
      assert.equal(pendingDecision.referrer_id, "user-referrer-1");
      assert.equal(pendingDecision.status, "pending");
    }

    const qualifiedDecision = evaluateReferralAttribution({
      registrant: {
        id: "user-new-3",
        email: "confirmed@college.edu",
        submitted_referral_code: "GROW-7F2A9B",
        email_verified: true
      },
      referrersByCode: referrers,
      existingAttributionsByReferredUser: new Set()
    });

    assert.equal(qualifiedDecision.valid, true);
    if (qualifiedDecision.valid) {
      assert.equal(qualifiedDecision.status, "qualified");
    }
  });

  it("rejects invalid or non-existent referral codes", () => {
    const referrers = new Map<string, ReferrerCandidate>();

    const malformed = evaluateReferralAttribution({
      registrant: {
        id: "u1",
        email: "u1@college.edu",
        submitted_referral_code: "BAD!@#CODE",
        email_verified: true
      },
      referrersByCode: referrers,
      existingAttributionsByReferredUser: new Set()
    });
    assert.deepEqual(malformed, { valid: false, reason: "malformed_code" });

    const unknown = evaluateReferralAttribution({
      registrant: {
        id: "u1",
        email: "u1@college.edu",
        submitted_referral_code: "GROW-999999",
        email_verified: true
      },
      referrersByCode: referrers,
      existingAttributionsByReferredUser: new Set()
    });
    assert.deepEqual(unknown, { valid: false, reason: "code_not_found" });
  });

  it("prevents self-referrals by user ID and by normalized email", () => {
    const referrers = new Map<string, ReferrerCandidate>([
      [
        "GROW-SELF01",
        {
          id: "student-1",
          email: "aarav@college.edu",
          referral_code: "GROW-SELF01",
          referred_by: null
        }
      ]
    ]);

    const sameId = evaluateReferralAttribution({
      registrant: {
        id: "student-1",
        email: "other@college.edu",
        submitted_referral_code: "GROW-SELF01",
        email_verified: true
      },
      referrersByCode: referrers,
      existingAttributionsByReferredUser: new Set()
    });
    assert.deepEqual(sameId, { valid: false, reason: "self_referral_id" });

    const sameEmail = evaluateReferralAttribution({
      registrant: {
        id: "student-2",
        email: "  AARAV@College.edu ",
        submitted_referral_code: "GROW-SELF01",
        email_verified: true
      },
      referrersByCode: referrers,
      existingAttributionsByReferredUser: new Set()
    });
    assert.deepEqual(sameEmail, { valid: false, reason: "self_referral_email" });
  });

  it("prevents duplicate referral attribution and referral loops", () => {
    const referrers = new Map<string, ReferrerCandidate>([
      [
        "GROW-LOOP01",
        {
          id: "student-b",
          email: "b@college.edu",
          referral_code: "GROW-LOOP01",
          referred_by: "student-a"
        }
      ]
    ]);

    const duplicate = evaluateReferralAttribution({
      registrant: {
        id: "student-c",
        email: "c@college.edu",
        submitted_referral_code: "GROW-LOOP01",
        email_verified: true
      },
      referrersByCode: referrers,
      existingAttributionsByReferredUser: new Set(["student-c"])
    });
    assert.deepEqual(duplicate, { valid: false, reason: "duplicate_attribution" });

    const loop = evaluateReferralAttribution({
      registrant: {
        id: "student-a",
        email: "a@college.edu",
        submitted_referral_code: "GROW-LOOP01",
        email_verified: true
      },
      referrersByCode: referrers,
      existingAttributionsByReferredUser: new Set()
    });
    assert.deepEqual(loop, { valid: false, reason: "referral_loop_detected" });
  });

  it("counts only qualified referrals and computes idempotent reward unlocks without duplicates", () => {
    const count = calculateQualifiedReferralCount("ref-1", [
      { referrer_id: "ref-1", referred_user_id: "u1", status: "qualified" },
      { referrer_id: "ref-1", referred_user_id: "u1", status: "qualified" }, // duplicate event row ignored
      { referrer_id: "ref-1", referred_user_id: "u2", status: "qualified" },
      { referrer_id: "ref-1", referred_user_id: "u3", status: "qualified" },
      { referrer_id: "ref-1", referred_user_id: "u4", status: "pending" },
      { referrer_id: "ref-1", referred_user_id: "u5", status: "flagged" },
      { referrer_id: "ref-1", referred_user_id: "u6", status: "rejected" }
    ]);

    assert.equal(count, 3);

    // First evaluation at 3 qualified referrals unlocks 0, 1, and 3 milestones
    const firstEval = computeIdempotentRewardUnlocks({
      userId: "ref-1",
      qualifiedReferralCount: count,
      rewardRules: DEFAULT_REWARD_RULES,
      existingUnlocks: []
    });
    assert.equal(firstEval.allEligibleRules.length, 3);
    assert.equal(firstEval.newUnlocksToInsert.length, 3);

    // Second evaluation with the existing unlocks is strictly idempotent (0 new inserts)
    const secondEval = computeIdempotentRewardUnlocks({
      userId: "ref-1",
      qualifiedReferralCount: count,
      rewardRules: DEFAULT_REWARD_RULES,
      existingUnlocks: firstEval.newUnlocksToInsert
    });
    assert.equal(secondEval.newUnlocksToInsert.length, 0);
  });
});

describe("GrowthOS — Authorization, Resource Eligibility & Privacy Tests", () => {
  it("prevents students from modifying their role, referral_code, or referred_by", () => {
    const roleEscalationAttempt = validateProfileUpdateInput({
      full_name: "Student Hacker",
      college: "Test College",
      graduation_year: "2026",
      role: "admin"
    });
    assert.equal(roleEscalationAttempt.success, false);

    const referralTamperAttempt = validateProfileUpdateInput({
      full_name: "Student Hacker",
      college: "Test College",
      graduation_year: "2026",
      referral_code: "GROW-CUSTOM"
    });
    assert.equal(referralTamperAttempt.success, false);
  });

  it("enforces resource visibility by qualified referral threshold and admin role", () => {
    const starterResource = DEFAULT_LEARNING_RESOURCES[0]; // threshold 0
    const tier3Resource = DEFAULT_LEARNING_RESOURCES[2]; // threshold 3
    const unpublishedResource = { ...tier3Resource, is_published: false };

    assert.equal(canStudentAccessResource(starterResource, 0, false), true);
    assert.equal(canStudentAccessResource(tier3Resource, 2, false), false);
    assert.equal(canStudentAccessResource(tier3Resource, 3, false), true);
    assert.equal(canStudentAccessResource(unpublishedResource, 10, false), false);
    assert.equal(canStudentAccessResource(unpublishedResource, 0, true), true); // Admin can preview
  });

  it("masks referred student names for privacy and blocks open redirects", () => {
    assert.equal(maskStudentNameForPrivacy("Aarav Reddy"), "Aarav R.");
    assert.equal(maskStudentNameForPrivacy("Sneha"), "Sneha");
    assert.equal(sanitizeRedirectPath("//evil.example.com", "/dashboard"), "/dashboard");
    assert.equal(sanitizeRedirectPath("https://evil.example.com", "/dashboard"), "/dashboard");
    assert.equal(sanitizeRedirectPath("/dashboard/referrals", "/dashboard"), "/dashboard/referrals");
  });
});

describe("GrowthOS — Product Flows & Analytics Formula Tests", () => {
  it("validates registration inputs and normalizes email addresses", () => {
    assert.equal(normalizeEmail("  Student.User@College.EDU "), "student.user@college.edu");

    const validReg = validateRegistrationInput({
      full_name: "Aarav Reddy",
      email: "  Aarav@College.edu ",
      password: "securePassword123",
      college: "JNTU Hyderabad",
      graduation_year: "2026",
      acquisition_source: "WhatsApp peer referral",
      referral_code: "grow-7f2a9b"
    });
    assert.equal(validReg.success, true);
    if (validReg.success) {
      assert.equal(validReg.data.email, "aarav@college.edu");
      assert.equal(validReg.data.referral_code, "GROW-7F2A9B");
    }
  });

  it("requires an explicit audit reason when an admin reviews a referral", () => {
    const missingReason = validateAdminReferralReviewInput({
      attribution_id: "attr-123",
      action: "reject",
      reason: "no"
    });
    assert.equal(missingReason.success, false);

    const validReview = validateAdminReferralReviewInput({
      attribution_id: "attr-123",
      action: "approve",
      reason: "Verified distinct college email domain"
    });
    assert.equal(validReview.success, true);
  });

  it("validates admin campaign settings and computes analytics without fabricating denominators", () => {
    const campaignCheck = validateAdminCampaignInput({
      name: "7-Day Campus Sprint",
      registration_goal: 500,
      start_date: "2026-10-29",
      end_date: "2026-11-05",
      budget_cap_inr: 2000,
      actual_spend_inr: 500,
      utm_campaign: "ai_project_60m"
    });
    assert.equal(campaignCheck.success, true);

    // When there are 0 registrations and 0 landing views, conversion rates return null (never fake numbers)
    const emptyMetrics = computeCampaignAnalyticsMetrics({
      totalRegistrations: 0,
      referralAttributedRegistrations: 0,
      qualifiedReferrals: 0,
      landingViews: 0,
      attendanceTrackedCount: 0,
      attendancePresentCount: 0,
      projectSubmissionsCount: 0,
      actualSpendInr: 0
    });
    assert.equal(emptyMetrics.landing_conversion_rate_percent, null);
    assert.equal(emptyMetrics.referral_conversion_rate_percent, null);
    assert.equal(emptyMetrics.cost_per_registration_inr, null);

    // With actual data, metrics compute accurately
    const activeMetrics = computeCampaignAnalyticsMetrics({
      totalRegistrations: 200,
      referralAttributedRegistrations: 50,
      qualifiedReferrals: 40,
      landingViews: 500,
      attendanceTrackedCount: 100,
      attendancePresentCount: 75,
      projectSubmissionsCount: 30,
      actualSpendInr: 1000
    });
    assert.equal(activeMetrics.referral_conversion_rate_percent, 25);
    assert.equal(activeMetrics.qualified_referral_rate_percent, 80);
    assert.equal(activeMetrics.landing_conversion_rate_percent, 40);
    assert.equal(activeMetrics.attendance_rate_percent, 75);
    assert.equal(activeMetrics.project_submission_rate_percent, 15);
    assert.equal(activeMetrics.cost_per_registration_inr, 5);
  });

  it("labels project rubric evaluations explicitly as automated text heuristics", () => {
    const validSub = validateProjectSubmissionInput({
      title: "AI Resume Gap Analyzer",
      problem_statement: "Final-year students struggle to tailor resumes to specific job descriptions.",
      description: "Built a Next.js web app with server-side Gemini API JSON schema validation and error fallbacks.",
      tech_stack: "Next.js, TypeScript, Gemini API JSON schema mode, error fallback",
      repo_url: "https://github.com/student/ai-resume-analyzer",
      demo_url: "https://ai-resume-analyzer.vercel.app"
    });
    assert.equal(validSub.success, true);
    if (validSub.success) {
      const evalRes = evaluateProjectSubmissionHeuristic(validSub.data);
      assert.equal(evalRes.is_automated_heuristic, true);
      assert.ok(evalRes.score >= 70 && evalRes.score <= 100);
    }
  });
});

