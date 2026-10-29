import type { Campaign, LearningResource, RewardRule, Workshop } from "./types.ts";

/**
 * Default campaign planning configuration (Targets & Hypotheses — NEVER displayed as actual results).
 * Administrators can update these values in the database via `/admin/campaigns`.
 */
export const DEFAULT_CAMPAIGN_CONFIG: Campaign = {
  id: "default-campaign-config",
  slug: "ai-project-60m-sprint",
  name: "Build Your First AI Project in 60 Minutes — 7-Day Campus Campaign",
  description:
    "Acquire 500 final-year engineering student registrations within 7 days with a maximum campaign budget of ₹2,000.",
  registration_goal: 500,
  start_date: "2026-10-29",
  end_date: "2026-11-05",
  budget_cap_inr: 2000,
  actual_spend_inr: 0,
  utm_campaign: "ai_project_60m",
  channel_targets: {
    college_clubs: 250,
    whatsapp_communities: 150,
    social_posts: 70,
    referral_conversions: 30
  },
  budget_allocation: {
    paid_promotion_inr: 1000,
    ambassador_materials_inr: 500,
    contingency_inr: 500
  },
  is_active: true,
  created_at: "2026-10-29T00:00:00.000Z",
  updated_at: "2026-10-29T00:00:00.000Z"
};

/**
 * Default workshop configuration.
 * Notice `scheduled_at` and `joining_url` are `null` until configured by an administrator
 * in `/admin/workshop` — we never fabricate confirmed event dates or joining links.
 */
export const DEFAULT_WORKSHOP_CONFIG: Workshop = {
  id: "default-workshop-config",
  slug: "build-first-ai-project-60m",
  title: "Build Your First AI Project in 60 Minutes",
  subtitle: "60 Minutes. One AI Project. Your First Step.",
  description:
    "A hands-on, beginner-friendly technical workshop where final-year engineering students scope, build, and deploy a functional AI application with structured JSON outputs, validation guardrails, and clear portfolio documentation.",
  scheduled_at: null,
  timezone: "Asia/Kolkata (IST)",
  duration_minutes: 60,
  joining_url: null,
  agenda: [
    {
      time: "00–10 min",
      title: "Problem Scoping & Input/Output Contract",
      detail:
        "Choose a focused workflow problem, define strict JSON input/output schemas, and avoid generic chat wrappers."
    },
    {
      time: "10–25 min",
      title: "Server-Side LLM Route & Prompt Guardrails",
      detail:
        "Connect a free-tier LLM API inside a server route, enforce structured JSON responses, and keep API keys off the client."
    },
    {
      time: "25–45 min",
      title: "Frontend State, Loading & Error Fallbacks",
      detail:
        "Build a clean React interface with accessible form validation, loading states, and graceful fallback handling."
    },
    {
      time: "45–60 min",
      title: "Deployment, README & Project Submission",
      detail:
        "Deploy your application, document the system architecture in your README, and submit your link in GrowthOS."
    }
  ],
  preparation_checklist: [
    { id: "node", label: "Install Node.js 20+ and a code editor (VS Code recommended)" },
    { id: "git", label: "Sign in to GitHub to push and deploy your workshop repository" },
    { id: "starter", label: "Read the AI Project Starter Kit (unlocked at 0 referrals upon registration)" },
    { id: "problem", label: "Select your project topic using the Workshop Project Scoper" }
  ],
  is_published: true,
  project_submissions_enabled: true,
  created_at: "2026-10-29T00:00:00.000Z",
  updated_at: "2026-10-29T00:00:00.000Z"
};

/**
 * Default reward milestone rules (0, 1, 3, and 5 qualified referrals).
 * Configurable by administrators via `/admin/resources`.
 */
export const DEFAULT_REWARD_RULES: RewardRule[] = [
  {
    id: "rule-0-starter",
    slug: "tier-0-starter",
    milestone_name: "AI Project Starter Kit",
    description: "Unlocked immediately upon registration. Environment setup guide, free-tier API instructions, and 60-minute build checklist.",
    required_referrals: 0,
    sort_order: 1,
    is_active: true
  },
  {
    id: "rule-1-prompts",
    slug: "tier-1-prompts",
    milestone_name: "Prompt Pack and AI Tools Guide",
    description: "Unlocked at 1 qualified referral. Deterministic JSON prompt patterns, output validation rules, and curated AI developer tools.",
    required_referrals: 1,
    sort_order: 2,
    is_active: true
  },
  {
    id: "rule-3-templates",
    slug: "tier-3-templates",
    milestone_name: "Guided Project Templates",
    description: "Unlocked at 3 qualified referrals. Full-stack project blueprints with API contracts, UI flows, and error-handling patterns.",
    required_referrals: 3,
    sort_order: 3,
    is_active: true
  },
  {
    id: "rule-5-bundle",
    slug: "tier-5-bundle",
    milestone_name: "Advanced Learning Bundle",
    description: "Unlocked at 5 qualified referrals. Prompt evaluation harness guide, architecture README blueprint, and technical viva preparation notes.",
    required_referrals: 5,
    sort_order: 4,
    is_active: true
  }
];

/**
 * Default learning resources mapped to the 0, 1, 3, and 5 referral milestones.
 */
export const DEFAULT_LEARNING_RESOURCES: LearningResource[] = [
  {
    id: "res-0-starter-kit",
    slug: "ai-project-starter-kit",
    title: "AI Project Starter Kit",
    description: "Zero-cost environment setup guide, API safety rules, and pre-workshop preparation checklist.",
    resource_type: "guide",
    unlock_threshold: 0,
    reward_rule_id: "rule-0-starter",
    content_markdown: `# AI Project Starter Kit (Starter Access — 0 Referrals Required)

## 1. Local Environment Prerequisites
- **Node.js:** v20 LTS or newer (\`node --version\`)
- **Code Editor:** VS Code with TypeScript and ESLint extensions
- **Version Control:** Git + GitHub account for deployment

## 2. API Key Safety Rules
1. Store all LLM API keys in \`.env.local\` on the server.
2. Never prefix secret API keys with \`NEXT_PUBLIC_\`.
3. Call the model only from a Next.js Server Route Handler (\`app/api/.../route.ts\`) or Server Action.

## 3. 60-Minute Build Structure
- **Minutes 00–10:** Define input form fields and strict JSON output interface.
- **Minutes 10–25:** Implement server endpoint with schema validation.
- **Minutes 25–45:** Wire frontend form state, loading spinner, and error boundary.
- **Minutes 45–60:** Test with 3 realistic inputs, write README, and deploy.`,
    external_url: null,
    storage_bucket: null,
    storage_path: null,
    is_published: true,
    is_archived: false,
    created_at: "2026-10-29T00:00:00.000Z",
    updated_at: "2026-10-29T00:00:00.000Z"
  },
  {
    id: "res-1-prompt-pack",
    slug: "prompt-pack-ai-tools-guide",
    title: "Prompt Pack and AI Tools Guide",
    description: "Structured JSON system prompt templates, hallucination guardrails, and schema enforcement patterns.",
    resource_type: "prompt_pack",
    unlock_threshold: 1,
    reward_rule_id: "rule-1-prompts",
    content_markdown: `# Prompt Pack and AI Tools Guide (Unlocked at 1 Qualified Referral)

## 1. Deterministic JSON Output System Prompt
\`\`\`text
You are a technical analysis assistant. Evaluate the user input and return ONLY valid JSON matching the schema below:
{
  "summary": "Concise technical summary under 50 words",
  "score": 0,
  "strengths": ["string"],
  "actionable_fixes": ["string"],
  "confidence": "high | medium | low"
}
Rules:
- Do not wrap the JSON in markdown code fences if JSON mode is enabled.
- Do not invent metrics not supported by the user input.
- If input context is insufficient, set "confidence": "low" and explain what is missing in "actionable_fixes".
\`\`\`

## 2. Input & Output Guardrails
- Trim and cap user input length (e.g. max 3,000 characters) before sending to the model.
- Parse the response inside a \`try / catch\` block and validate every required field before returning to the client.`,
    external_url: null,
    storage_bucket: null,
    storage_path: null,
    is_published: true,
    is_archived: false,
    created_at: "2026-10-29T00:00:00.000Z",
    updated_at: "2026-10-29T00:00:00.000Z"
  },
  {
    id: "res-3-project-templates",
    slug: "guided-project-templates",
    title: "Guided Project Templates",
    description: "Three modular 60-minute AI project blueprints with request/response schemas and UI component outlines.",
    resource_type: "template",
    unlock_threshold: 3,
    reward_rule_id: "rule-3-templates",
    content_markdown: `# Guided Project Templates (Unlocked at 3 Qualified Referrals)

## Template 1: Resume & Job-Description Gap Analyzer
- **Target User:** Final-year engineering students preparing for campus placements
- **Inputs:** Resume text + target role description
- **Server Output Schema:** \`{ matchPercentage, missingKeywords[], bulletImprovements[], interviewQuestions[] }\`

## Template 2: Course Notes to Active-Recall Quiz Builder
- **Target User:** Students revising technical subjects before exams
- **Inputs:** Lecture notes text + difficulty level (\`foundational | intermediate | viva\`)
- **Server Output Schema:** \`{ topicSummary, questions: [{ prompt, options[], answerIndex, rationale }] }\`

## Template 3: Stack-Trace & Code Diff Diagnostic Assistant
- **Target User:** Student developers debugging project errors
- **Inputs:** Error message / stack trace + relevant code snippet
- **Server Output Schema:** \`{ rootCause, fixSteps[], refactoredSnippet, edgeCaseTests[] }\``,
    external_url: null,
    storage_bucket: null,
    storage_path: null,
    is_published: true,
    is_archived: false,
    created_at: "2026-10-29T00:00:00.000Z",
    updated_at: "2026-10-29T00:00:00.000Z"
  },
  {
    id: "res-5-advanced-bundle",
    slug: "advanced-learning-bundle",
    title: "Advanced Learning Bundle",
    description: "Prompt evaluation methodology, production README structure, and technical interview preparation guide.",
    resource_type: "roadmap",
    unlock_threshold: 5,
    reward_rule_id: "rule-5-bundle",
    content_markdown: `# Advanced Learning Bundle (Unlocked at 5 Qualified Referrals)

## 1. Designing a Mini Prompt Evaluation Suite
Instead of testing your prompt manually once, create an array of 5 test cases:
1. **Standard valid input** — verify all JSON keys populate accurately.
2. **Short/minimal input** — verify \`confidence: "low"\` triggers gracefully without hallucination.
3. **Boundary length input** — verify latency stays within acceptable limits.
4. **Formatting edge case** — special characters, code blocks, or markdown symbols.
5. **Off-topic input** — verify the guardrail declines or guides the user back on track.

## 2. Portfolio-Grade GitHub README Structure
- **Problem Statement:** Who experiences this problem and why existing manual workflows are slow.
- **Architecture Diagram:** Client Form → Next.js Route Handler (Input Validation) → LLM API (Structured Schema) → Validated UI State.
- **Reliability & Security:** Explain rate limiting, server-only API keys, and schema fallback handling.
- **Local Setup:** Exact 3-step instructions with \`.env.example\`.`,
    external_url: null,
    storage_bucket: null,
    storage_path: null,
    is_published: true,
    is_archived: false,
    created_at: "2026-10-29T00:00:00.000Z",
    updated_at: "2026-10-29T00:00:00.000Z"
  }
];

