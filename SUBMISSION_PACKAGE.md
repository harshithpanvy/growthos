# NxtWave Growth Intern Challenge — Complete Submission Package

- **Deliverable 1 (Growth Plan — Max 5 Slides / 2 Pages):** Section 1 below
- **Deliverable 2 (Working Asset):** GrowthOS (`app/page.tsx` + `supabase/schema.sql`)
- **Deliverable 3 (Reflections & AI + Learning Notes):** Sections 2 & 3 below
- **Deliverable 4 (3-Minute Video Script):** Section 4 below

---

## Section 1: The 5-Slide Growth Plan (2-Page Document)

### Slide 1: Understanding the Student (Who, Why, & Trigger)

1. **Who Exactly Are We Targeting?**
   - **Primary Persona:** Final-Year (4th Year, 2026/2027 Batch) CSE, IT, and ECE Students in Tier-2 and Tier-3 engineering colleges (e.g., JNTU, VIT, SRM, state university affiliates).
   - **Behavioral Profile:** Active in batch-level WhatsApp groups (60–180 students per section) and campus placement channels; currently preparing for campus drives and off-campus SDE/Analyst roles.
2. **Why Would They Care? (The Core Pain Point)**
   - **The Placement Reality Gap:** In 2026 placement interviews, recruiters skip generic CRUD projects (MERN Todo App, Library Management System). Interviewers ask: *"Have you built anything practical with LLMs, APIs, or AI workflows?"*
   - **The Misconception Blocking Action:** Final-year students assume building a real AI project requires weeks of ML math or paid OpenAI API credits (requiring an international credit card).
3. **What Makes Them Register Right Now?**
   - **A 60-Minute Shipped Portfolio Asset:** *"Enter with an empty repo. Leave in 60 minutes with a deployed AI app (using 100% free Gemini/Groq APIs), a recruiter-ready GitHub README, and 2 STAR-format ATS resume bullets."*
   - **Instant Pre-Workshop Value:** Upon registering on GrowthOS, students immediately unlock the **60-Min AI Project Scoper** and **Zero-Cost API Starter Kit**.

---

### Slide 2: Prioritized 3-Channel Campaign Plan (₹2,000 Budget | 7 Days)

| Priority | Channel | What We Do | Why It Works | Budget | Target Signups |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **#1** | **Campus Coding Club & Class Rep (CR) Squad Seeding** | Partner with 12 final-year CRs / Coding Club leads across Tier-2/3 colleges. Give each a custom tracked link (`?ref=GROW-JNTU`). Offer **4 x ₹300 "Campus Squad Bounties"** + Featured Certificates to the first 4 campus leads who hit 25+ verified batchmate signups. | CRs already control official 4th-year placement WhatsApp groups where open rates exceed 80%. Paying on verified outcome guarantees 100+ baseline signups. | **₹1,200** | **220** |
| **#2** | **GrowthOS Built-In Viral WhatsApp Referral Loop** | Every registrant gets a unique `?ref=CODE` link and **1-Click WhatsApp message templates** (*Class Group Drop*, *Placement Buddy DM*). **1 referral** = *Production Prompt Pack*; **3 referrals** = *ATS Resume & GitHub README Kit*; **5 referrals** = *Placement AI Viva Vault*. | Students don't share corporate flyers, but they invite 2–3 study buddies when the reward directly helps them pass upcoming placement interviews. | **₹0** | **198** |
| **#3** | **60-Second "Watch Me Build It" Proof Video + Live Builder Grants** | Post a 60-second screen recording on LinkedIn & placement communities showing the AI Resume Analyzer being built & deployed. Fund **2 x ₹400 "Best 60-Min Project Built Live" prizes** graded by GrowthOS's AI Evaluator at Minute 55. | Overcomes skepticism (*"Can I really build this in 60 mins?"*) and boosts live show-up rate. | **₹800** | **90** |
| **Total** | **3 Focused Channels** | **Full-Funnel Acquisition + Retention** | **Blended CAC: ₹3.93 / student** | **₹2,000** | **508** |

---

### Slide 3: Funnel Math & 7-Day Execution Timeline

#### How the 500 Registrations Come In
- **Seeded Base (Channels 1 & 3):**
  - 12 Campus CR / Coding Club WhatsApp groups (~1,440 students) -> 317 clicks (22% CTR) -> **220 registrations** (69% conversion).
  - 60s Live Build Proof Video across LinkedIn & placement groups -> 260 visits -> **90 registrations** (35% conversion).
  - **Total Seeded Signups = 310.**
- **Viral Referral Multiplier (Channel 2 — GrowthOS Loop):**
  - 38% of registered students (118 students) share their 1-click WhatsApp link to unlock Tier 1 & Tier 2 kits.
  - Each sharer reaches ~4 peers at a 42% conversion rate (`K = 0.38 * 4 * 0.42 = 0.64`).
  - **Wave 1 + Wave 2 Referrals = +198 registrations.**
- **Total 7-Day Registrations = 310 + 198 = 508 Verified Registrations** (~325 live builders at 64% attendance).

#### 7-Day Execution Cadence
- **Day 1:** Deploy GrowthOS; onboard 12 CRs / club leads with tracked `?ref=` codes. *(45 signups)*
- **Day 2:** Coordinated 7:30 PM WhatsApp group drop + 60-sec proof reel. *(165 cumulative)*
- **Day 3:** Nudge 0-referral registrants to invite 1 buddy for the Prompt Pack unlock. *(260 cumulative)*
- **Day 4:** Showcase the **60-Min AI Project Scoper** & resume bullets in placement groups. *(345 cumulative)*
- **Day 5:** Publish Top 5 Campus Squad Leaderboard update to drive inter-college competition for the 4 x ₹300 bounties. *(430 cumulative)*
- **Day 6:** Scarcity push (450/500 seats claimed) + pre-workshop API key setup check. *(485 cumulative)*
- **Day 7:** Morning T-3h WhatsApp reminder -> **508+ registrations** -> Live 60-Min Build + Automated Project Evaluation.

---

### Slide 4: What I Built — GrowthOS (4-in-1 Growth & Workshop Engine)

Built with **Next.js 15, TypeScript, and Supabase (Auth + PostgreSQL RLS + RPC)** plus an **Instant 1-Click Reviewer Sandbox**:
1. **Tab 1 — Student Hub & 1-Click WhatsApp Viral Loop:** Attribution via `?ref=CODE`, PostgreSQL `SECURITY DEFINER` trigger, 3 peer-native WhatsApp message templates, and an interactive **Placement Resource Vault** (unlocking actual copyable kits at 0, 1, 3, and 5 referrals).
2. **Tab 2 — 60-Min AI Project Scoper:** Generates a personalized 60-minute build timeline, free API stack, starter system prompt, and ATS resume bullet based on target placement role.
3. **Tab 3 — Automated AI Project Rubric Evaluator:** Grades student project submissions out of 100 across 4 engineering rubrics (*Problem Clarity, Prompt Guardrails, 60-Min Demo Readiness, Portfolio Framing*) and auto-generates STAR resume bullets.
4. **Tab 4 — ₹2,000 Growth Command Center:** Live viral K-factor funnel simulator, channel budget ledger, and Campus Squad Leaderboard.

---

### Slide 5: Why This System Wins Beyond Registration Count

- **Eliminates Pre-Workshop Drop-Off:** Students configure their project blueprint and free API stack immediately after registering.
- **Turns Workshop Completion into Cohort 2 Acquisition:** At Minute 55, students run their project through Tab 3's **Automated AI Project Evaluator** and share their verified scorecard (`94/100`) on LinkedIn/WhatsApp.

---

## Section 2: Show Us How You Thought (Reflection Answers)

### 1. What changed between your first idea and final solution?
- **First Idea:** A standard registration landing page with a referral counter and ₹2,000 spent on Instagram ads + an Amazon voucher giveaway.
- **Final Solution:**
  1. Replaced generic cash/voucher giveaways (which attract low-intent contest hunters) with **placement-critical unlocks** (*Production Prompt Pack, ATS Resume & README Kit, Placement Viva Vault*).
  2. Expanded from a simple landing page into a **4-module lifecycle platform** that handles Acquisition (WhatsApp Loop), Pre-Workshop Activation (60-Min AI Project Scoper), Workshop Evaluation at Scale (Automated Rubric Grader), and Attribution (Growth Command Center).
  3. Added an **Instant 1-Click Reviewer Sandbox** alongside production Supabase RLS so evaluators can test every referral unlock and AI tool immediately without setup friction.

### 2. If you had another 24 hours, what would you improve?
1. **Automated WhatsApp Webhook Notifications (`n8n` / WhatsApp Cloud API):** Send instant WhatsApp alerts when a classmate registers using a student's `?ref=` link (*"1 away from unlocking the ATS Resume Kit!"*) plus automated `T-24h` and `T-1h` workshop reminders.
2. **Live GitHub Commit Verification:** Connect the Automated AI Project Evaluator (`Tab 3`) to the GitHub REST API to automatically verify repo commits made during the 60-minute workshop window and mint a verifiable credential URL.
3. **Dynamic Campus Personalization:** Render college-specific social proof banners via URL params (`?college=JNTUH` -> *"Join 68 students from JNTU Hyderabad building live this Sunday"*).

### 3. What did AI suggest that you deliberately rejected and why?
1. **Rejected: Spending ₹1,500 on Instagram/Meta Ads.** At ₹18–₹30 CPC and 15–20% conversion, ₹1,500 yields <15 signups. I instead used **outcome-based Campus Squad Micro-Bounties (₹1,200)** and **Live Builder Grants (₹800)**, achieving 508+ signups at ₹3.93 CAC.
2. **Rejected: Gating the Workshop Link Behind 3 Mandatory Referrals.** Mandatory referral walls hurt student trust and incentivize fake burner emails. Workshop access is 100% free; referrals only unlock bonus placement prep packs.
3. **Rejected: Public `SELECT *` on the `profiles` Table for Client-Side Referral Counting.** Exposing all profile rows leaks student emails and names in browser network logs. I enforced strict Row-Level Security (`auth.uid() = id`) and built a `SECURITY DEFINER` RPC (`my_referral_count()`) that returns only the integer referral count.

---

## Section 3: AI + Learning Notes (What I Asked -> Suggested -> Changed)

1. **Referral Attribution & Database Security**
   - *Asked:* How to attribute `?ref=CODE` signups and show referral counts in Supabase + Next.js.
   - *AI Suggested:* Generating codes on the client and querying `profiles` with a public `SELECT` policy.
   - *Changed:* Moved code generation and referrer lookup into a `SECURITY DEFINER` PostgreSQL `auth.users` trigger (`create_growthos_profile`) with a `no_self_referral` constraint and a scoped `my_referral_count()` RPC.
2. **Peer-Native WhatsApp Share Copy**
   - *Asked:* Write WhatsApp referral messages for the workshop.
   - *AI Suggested:* Corporate marketing copy (*"Unlock your future in AI! Join our transformative masterclass..."*).
   - *Changed:* Rewrote into 3 authentic, student-native templates (*Class WhatsApp Group Drop*, *1-on-1 Placement Buddy DM*, *Coding Club Broadcast*) focused on placement anxiety and shipping a GitHub repo in 60 mins with free APIs.
3. **Workshop Engagement & Automated Evaluation**
   - *Asked:* How to make the working asset stand out beyond a landing page.
   - *AI Suggested:* Adding a countdown timer and static FAQ section.
   - *Changed:* Built the **60-Min AI Project Scoper** (`Tab 2`) and the **Automated AI Project Rubric Evaluator** (`Tab 3`) that scores student projects out of 100 and generates STAR-format resume bullets.

---

## Section 4: 3-Minute Video Walkthrough Script

- **0:00 – 0:35 (Student Insight & Overview):** Show **Tab 1**. Explain the final-year placement pain point (recruiters skip CRUD apps; students think AI projects need paid APIs) and introduce **GrowthOS** as a 4-in-1 acquisition + workshop engine.
- **0:35 – 1:25 (₹2,000 Plan & Funnel Math):** Switch to **Tab 4 (Growth Command Center)**. Adjust the K-Factor simulator sliders, show how ₹1,200 in Campus Squad Bounties + ₹800 in Live Builder Grants + ₹0 WhatsApp Referral Loop compounds 310 seeded signups into **508+ registrations at ₹3.93 CAC**, and show the Campus Leaderboard.
- **1:25 – 2:15 (Viral WhatsApp Loop & Resource Vault):** Switch to **Tab 1**, click **"Instant 1-Click Reviewer Login"**, demo the 3 **WhatsApp Share Flow** templates, and click **"+1 Simulate Friend Referral"** to unlock and inspect the templates inside the **Placement Resource Vault**.
- **2:15 – 3:00 (60-Min AI Project Scoper & Automated Evaluator):** Switch to **Tab 2 (60-Min AI Project Scoper)**, generate a role-specific blueprint, click **"Send to AI Project Evaluator"** (`Tab 3`), and compare the **94/100 Top Sample** vs **61/100 Weak Submission** with auto-generated STAR resume bullets.

